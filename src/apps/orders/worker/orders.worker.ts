import { RabbitMQConsumer } from "../../../infra/messaging/rabbitmq/consumer";
import { OrdersService } from "../service/orders.service";
import {
  PaymentConfirmedEvent,
  PaymentFailedEvent,
} from "../events/order.events";
import { serviceLogger } from "../../../infra/logger/logger";

export class OrdersWorker {
  constructor(private readonly ordersService: OrdersService) {}

  async start(): Promise<void> {
    const consumer = new RabbitMQConsumer();
    await consumer.connect();

    await consumer.assertExchange("payments", "topic", { durable: true });

    await consumer.consume(
      "orders-payment-confirmed",
      async (message: unknown) => {
        const paymentConfirmedEvent = message as PaymentConfirmedEvent;
        const logContext = {
          orderId: paymentConfirmedEvent.orderId,
          paymentId: paymentConfirmedEvent.paymentId,
          event: "PaymentConfirmed",
        };

        try {
          serviceLogger.orders.info(logContext, "PaymentConfirmed recebido");

          await this.ordersService.confirmOrder(paymentConfirmedEvent.orderId);

          serviceLogger.orders.info(
            logContext,
            "Pedido confirmado com sucesso"
          );
        } catch (error) {
          serviceLogger.orders.error(
            {
              ...logContext,
              error: error instanceof Error ? error.message : String(error),
            },
            "Erro ao processar PaymentConfirmed"
          );
          throw error;
        }
      },
      {
        exchange: "payments",
        routingKey: "payment.confirmed",
        enableIdempotency: true,
      }
    );

    await consumer.consume(
      "orders-payment-failed",
      async (message: unknown) => {
        const paymentFailedEvent = message as PaymentFailedEvent;
        const logContext = {
          orderId: paymentFailedEvent.orderId,
          paymentId: paymentFailedEvent.paymentId,
          event: "PaymentFailed",
          reason: paymentFailedEvent.reason,
        };

        try {
          serviceLogger.orders.info(logContext, "PaymentFailed recebido");

          await this.ordersService.cancelOrder(
            paymentFailedEvent.orderId,
            paymentFailedEvent.reason
          );

          serviceLogger.orders.info(logContext, "Pedido cancelado com sucesso");
        } catch (error) {
          serviceLogger.orders.error(
            {
              ...logContext,
              error: error instanceof Error ? error.message : String(error),
            },
            "Erro ao processar PaymentFailed"
          );
          throw error;
        }
      },
      {
        exchange: "payments",
        routingKey: "payment.failed",
        enableIdempotency: true,
      }
    );

    serviceLogger.orders.info(
      {
        queues: ["orders-payment-confirmed", "orders-payment-failed"],
        exchanges: ["payments"],
        routingKeys: ["payment.confirmed", "payment.failed"],
      },
      "Orders Worker iniciado"
    );
  }
}
