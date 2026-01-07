import { RabbitMQConsumer } from "../../../infra/messaging/rabbitmq/consumer";
import { NotificationService } from "../service/notification.service";
import {
  OrderConfirmedEvent,
  OrderCancelledEvent,
} from "../../orders/events/order.events";
import { OrdersRepository } from "../../orders/repository/orders.repository";
import { serviceLogger } from "../../../infra/logger/logger";

export class NotificationWorker {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly ordersRepository: OrdersRepository
  ) {}

  async start(): Promise<void> {
    const consumer = new RabbitMQConsumer();
    await consumer.connect();

    await consumer.assertExchange("orders", "topic", { durable: true });

    await consumer.consume(
      "notification-order-confirmed",
      async (message: unknown) => {
        const orderConfirmedEvent = message as OrderConfirmedEvent;
        const logContext = {
          orderId: orderConfirmedEvent.orderId,
          customerId: orderConfirmedEvent.customerId,
          event: "OrderConfirmed",
        };

        try {
          serviceLogger.notification.info(
            logContext,
            "OrderConfirmed recebido para enviar notificação"
          );

          const order = await this.ordersRepository.findOrderById(
            orderConfirmedEvent.orderId
          );

          await this.notificationService.sendOrderConfirmationEmail(order);

          serviceLogger.notification.info(
            { ...logContext, customerEmail: order.customer.email },
            "Email de confirmação enviado"
          );
        } catch (error) {
          serviceLogger.notification.error(
            {
              ...logContext,
              error: error instanceof Error ? error.message : String(error),
            },
            "Erro ao enviar email de confirmação"
          );
        }
      },
      {
        exchange: "orders",
        routingKey: "order.confirmed",
        enableIdempotency: true,
      }
    );

    await consumer.consume(
      "notification-order-cancelled",
      async (message: unknown) => {
        const orderCancelledEvent = message as OrderCancelledEvent;
        const logContext = {
          orderId: orderCancelledEvent.orderId,
          customerId: orderCancelledEvent.customerId,
          reason: orderCancelledEvent.reason,
          event: "OrderCancelled",
        };

        try {
          serviceLogger.notification.info(
            logContext,
            "OrderCancelled recebido para enviar notificação"
          );

          const order = await this.ordersRepository.findOrderById(
            orderCancelledEvent.orderId
          );

          await this.notificationService.sendOrderCancelledEmail(order);

          serviceLogger.notification.info(
            { ...logContext, customerEmail: order.customer.email },
            "Email de cancelamento enviado"
          );
        } catch (error) {
          serviceLogger.notification.error(
            {
              ...logContext,
              error: error instanceof Error ? error.message : String(error),
            },
            "Erro ao enviar email de cancelamento"
          );
        }
      },
      {
        exchange: "orders",
        routingKey: "order.cancelled",
        enableIdempotency: true,
      }
    );

    serviceLogger.notification.info(
      {
        queues: [
          "notification-order-confirmed",
          "notification-order-cancelled",
        ],
        exchange: "orders",
        routingKeys: ["order.confirmed", "order.cancelled"],
      },
      "Notification Worker iniciado"
    );
  }
}
