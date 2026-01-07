import { PaymentStatus } from "../enums/payment.enum";
import { Payment } from "../models/payment";
import { PaymentRepository } from "../repository/payment.repository";
import { ProcessPaymentDTO } from "../dto";
import { PaymentGateway } from "../gateway/payment.gateway";
import { RabbitMQPublisher } from "../../../infra/messaging/rabbitmq/publisher";
import {
  PaymentConfirmedEvent,
  PaymentFailedEvent,
} from "../events/payment.events";
import { serviceLogger } from "../../../infra/logger/logger";
import { OrdersRepository } from "../../orders/repository/orders.repository";
import { OrdersService } from "../../orders/service/orders.service";
import { InventoryRepository } from "../../inventory/repository/inventory.repository";
import { BadRequestError } from "../../../helpers/errors/errors";

export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentGateway: PaymentGateway,
    private readonly rabbitMQPublisher: RabbitMQPublisher,
    private readonly ordersRepository: OrdersRepository,
    private readonly ordersService: OrdersService,
    private readonly inventoryRepository: InventoryRepository
  ) {}

  async processPayment(data: ProcessPaymentDTO): Promise<Payment> {
    const order = await this.ordersRepository.findOrderById(data.orderId);

    const reservations =
      await this.inventoryRepository.getReservationsByOrderId(data.orderId);

    const pendingReservations = reservations.filter(
      (res) => res.status === "PENDING" && new Date(res.expiresAt) > new Date()
    );

    const reservedProductIds = new Set(
      pendingReservations.map((res) => res.productId)
    );

    const missingProducts = order.items.filter(
      (item) => !reservedProductIds.has(item.product.id)
    );

    if (missingProducts.length > 0) {
      const missingProductNames = missingProducts
        .map((item) => item.product.name)
        .join(", ");
      const cancelReason = `Não é possível processar o pagamento. Alguns produtos não foram reservados ou as reservas expiraram: ${missingProductNames}`;

      serviceLogger.payment.warn(
        {
          orderId: data.orderId,
          missingProducts: missingProducts.map((item) => ({
            productId: item.product.id,
            productName: item.product.name,
          })),
        },
        "Cancelando pedido: reservas inválidas ou expiradas"
      );

      await this.ordersService.cancelOrder(data.orderId, cancelReason);

      throw new BadRequestError(cancelReason);
    }

    const payment = await this.paymentRepository.createPayment({
      orderId: data.orderId,
      amount: data.amount,
    });

    const paymentGatewayResponse = await this.paymentGateway.processPayment(
      payment
    );

    await this.rabbitMQPublisher.assertExchange("payments", "topic", {
      durable: true,
    });

    if (paymentGatewayResponse.status === PaymentStatus.CONFIRMED) {
      await this.paymentRepository.updatePaymentStatus(
        payment.id,
        PaymentStatus.CONFIRMED
      );

      const paymentConfirmedEvent: PaymentConfirmedEvent = {
        orderId: payment.orderId,
        paymentId: payment.id,
        amount: payment.amount,
        confirmedAt: new Date().toISOString(),
      };

      await this.rabbitMQPublisher.publish("payments", paymentConfirmedEvent, {
        exchange: "payments",
        routingKey: "payment.confirmed",
        messageId: `${payment.id}-confirmed`,
      });

      serviceLogger.payment.info(
        {
          paymentId: payment.id,
          orderId: payment.orderId,
          amount: payment.amount,
          event: "PaymentConfirmed",
          exchange: "payments",
          routingKey: "payment.confirmed",
        },
        "Evento PaymentConfirmed publicado"
      );
    } else {
      await this.paymentRepository.updatePaymentStatus(
        payment.id,
        PaymentStatus.CANCELLED
      );

      const paymentFailedEvent: PaymentFailedEvent = {
        orderId: payment.orderId,
        paymentId: payment.id,
        amount: payment.amount,
        reason: "Payment gateway rejected the payment",
        failedAt: new Date().toISOString(),
      };

      await this.rabbitMQPublisher.publish("payments", paymentFailedEvent, {
        exchange: "payments",
        routingKey: "payment.failed",
        messageId: `${payment.id}-failed`,
      });

      serviceLogger.payment.info(
        {
          paymentId: payment.id,
          orderId: payment.orderId,
          amount: payment.amount,
          event: "PaymentFailed",
          exchange: "payments",
          routingKey: "payment.failed",
          reason: paymentFailedEvent.reason,
        },
        "Evento PaymentFailed publicado"
      );
    }

    return await this.paymentRepository.findPaymentById(payment.id);
  }

  async findPaymentById(id: string): Promise<Payment> {
    return await this.paymentRepository.findPaymentById(id);
  }
}
