import { RabbitMQConsumer } from "../../../infra/messaging/rabbitmq/consumer";
import { InventoryService } from "../service/inventory.service";
import { OrdersService } from "../../orders/service/orders.service";
import {
  OrderCreatedEvent,
  OrderConfirmedEvent,
  OrderCancelledEvent,
} from "../../orders/events/order.events";
import { serviceLogger } from "../../../infra/logger/logger";

export class InventoryWorker {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly ordersService: OrdersService
  ) {}

  async start(): Promise<void> {
    const consumer = new RabbitMQConsumer();
    await consumer.connect();

    await consumer.assertExchange("orders", "topic", { durable: true });

    await consumer.consume(
      "inventory-order-created",
      async (message: unknown) => {
        const orderCreatedEvent = message as OrderCreatedEvent;
        const logContext = {
          orderId: orderCreatedEvent.orderId,
          customerId: orderCreatedEvent.customerId,
          itemsCount: orderCreatedEvent.items.length,
          event: "OrderCreated",
        };

        try {
          serviceLogger.inventory.info(
            logContext,
            "OrderCreated recebido para reservar produtos"
          );

          let successCount = 0;
          let errorCount = 0;
          const failedProducts: Array<{
            productId: string;
            productName: string;
            quantity: number;
            error: string;
          }> = [];

          for (const item of orderCreatedEvent.items) {
            try {
              await this.inventoryService.reserveProduct({
                productId: item.product.id,
                orderId: orderCreatedEvent.orderId,
                quantity: item.quantity,
                expiresInMinutes: 30,
              });
              successCount++;
              serviceLogger.inventory.debug(
                {
                  ...logContext,
                  productId: item.product.id,
                  quantity: item.quantity,
                },
                "Produto reservado"
              );
            } catch (error) {
              errorCount++;
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              failedProducts.push({
                productId: item.product.id,
                productName: item.product.name,
                quantity: item.quantity,
                error: errorMessage,
              });
              serviceLogger.inventory.error(
                {
                  ...logContext,
                  productId: item.product.id,
                  quantity: item.quantity,
                  error: errorMessage,
                },
                "Erro ao reservar produto"
              );
            }
          }

          serviceLogger.inventory.info(
            { ...logContext, successCount, errorCount },
            "Reservas processadas"
          );

          if (errorCount > 0) {
            const failedProductNames = failedProducts
              .map((fp) => `${fp.productName} (qtd: ${fp.quantity})`)
              .join(", ");
            const cancelReason = `Estoque insuficiente para os seguintes produtos: ${failedProductNames}`;

            serviceLogger.inventory.warn(
              {
                ...logContext,
                failedProducts: failedProducts.map((fp) => ({
                  productId: fp.productId,
                  productName: fp.productName,
                  quantity: fp.quantity,
                })),
              },
              "Cancelando pedido devido à falta de estoque"
            );

            try {
              await this.inventoryService.releaseReservationsByOrderId(
                orderCreatedEvent.orderId
              );
              serviceLogger.inventory.info(
                logContext,
                "Reservas parciais liberadas antes de cancelar o pedido"
              );
            } catch (releaseError) {
              serviceLogger.inventory.error(
                {
                  ...logContext,
                  error:
                    releaseError instanceof Error
                      ? releaseError.message
                      : String(releaseError),
                },
                "Erro ao liberar reservas parciais"
              );
            }

            try {
              await this.ordersService.cancelOrder(
                orderCreatedEvent.orderId,
                cancelReason
              );
              serviceLogger.inventory.info(
                {
                  ...logContext,
                  reason: cancelReason,
                },
                "Pedido cancelado automaticamente devido à falta de estoque"
              );
            } catch (cancelError) {
              serviceLogger.inventory.error(
                {
                  ...logContext,
                  error:
                    cancelError instanceof Error
                      ? cancelError.message
                      : String(cancelError),
                },
                "Erro ao cancelar pedido automaticamente"
              );
              throw cancelError;
            }
          }
        } catch (error) {
          serviceLogger.inventory.error(
            {
              ...logContext,
              error: error instanceof Error ? error.message : String(error),
            },
            "Erro ao processar OrderCreated"
          );
          throw error;
        }
      },
      {
        exchange: "orders",
        routingKey: "order.created",
        enableIdempotency: true,
      }
    );

    await consumer.consume(
      "inventory-order-confirmed",
      async (message: unknown) => {
        const orderConfirmedEvent = message as OrderConfirmedEvent;
        const logContext = {
          orderId: orderConfirmedEvent.orderId,
          customerId: orderConfirmedEvent.customerId,
          event: "OrderConfirmed",
        };

        try {
          serviceLogger.inventory.info(logContext, "OrderConfirmed recebido");

          await this.inventoryService.confirmReservationsByOrderId(
            orderConfirmedEvent.orderId
          );

          serviceLogger.inventory.info(
            logContext,
            "Reservas confirmadas e movimentação OUT criada"
          );
        } catch (error) {
          serviceLogger.inventory.error(
            {
              ...logContext,
              error: error instanceof Error ? error.message : String(error),
            },
            "Erro ao processar OrderConfirmed"
          );
          throw error;
        }
      },
      {
        exchange: "orders",
        routingKey: "order.confirmed",
        enableIdempotency: true,
      }
    );

    await consumer.consume(
      "inventory-order-cancelled",
      async (message: unknown) => {
        const orderCancelledEvent = message as OrderCancelledEvent;
        const logContext = {
          orderId: orderCancelledEvent.orderId,
          customerId: orderCancelledEvent.customerId,
          reason: orderCancelledEvent.reason,
          event: "OrderCancelled",
        };

        try {
          serviceLogger.inventory.info(logContext, "OrderCancelled recebido");

          await this.inventoryService.releaseReservationsByOrderId(
            orderCancelledEvent.orderId
          );

          serviceLogger.inventory.info(logContext, "Reservas liberadas");
        } catch (error) {
          serviceLogger.inventory.error(
            {
              ...logContext,
              error: error instanceof Error ? error.message : String(error),
            },
            "Erro ao processar OrderCancelled"
          );
          throw error;
        }
      },
      {
        exchange: "orders",
        routingKey: "order.cancelled",
        enableIdempotency: true,
      }
    );

    serviceLogger.inventory.info(
      {
        queues: [
          "inventory-order-created",
          "inventory-order-confirmed",
          "inventory-order-cancelled",
        ],
        exchange: "orders",
        routingKeys: ["order.created", "order.confirmed", "order.cancelled"],
      },
      "Inventory Worker iniciado"
    );
  }
}
