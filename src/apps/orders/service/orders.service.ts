import { Order } from "../models/orders";
import { OrdersRepository } from "../repository/orders.repository";
import { CreateOrderDTO, UpdateOrderStatusDTO, GetOrderByIdDTO } from "../dto";
import { OrderStatus } from "../enums/order-status.enum";
import { RabbitMQPublisher } from "../../../infra/messaging/rabbitmq/publisher";
import {
  OrderCreatedEvent,
  OrderConfirmedEvent,
  OrderCancelledEvent,
} from "../events/order.events";
import { serviceLogger } from "../../../infra/logger/logger";

export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly rabbitMQPublisher: RabbitMQPublisher
  ) {}

  async createOrder(data: CreateOrderDTO): Promise<Order> {
    const orderData = {
      ...data,
      status: data.status as OrderStatus,
    };
    const order = await this.ordersRepository.createOrder(orderData);

    const orderCreatedEvent: OrderCreatedEvent = {
      orderId: order.id,
      customerId: order.customer.id,
      items: order.items,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
    };

    await this.rabbitMQPublisher.assertExchange("orders", "topic", {
      durable: true,
    });

    await this.rabbitMQPublisher.publish("orders", orderCreatedEvent, {
      exchange: "orders",
      routingKey: "order.created",
      messageId: order.id,
    });

    serviceLogger.orders.info(
      {
        orderId: order.id,
        event: "OrderCreated",
        exchange: "orders",
        routingKey: "order.created",
      },
      "Evento OrderCreated publicado"
    );

    return order;
  }

  async updateOrderStatus(
    id: string,
    data: UpdateOrderStatusDTO
  ): Promise<void> {
    return await this.ordersRepository.updateOrderStatus(
      id,
      data.status as OrderStatus
    );
  }

  async findOrderById(data: GetOrderByIdDTO): Promise<Order> {
    return await this.ordersRepository.findOrderById(data.id);
  }

  async confirmOrder(orderId: string): Promise<Order> {
    await this.ordersRepository.updateOrderStatus(
      orderId,
      OrderStatus.CONFIRMED
    );

    const order = await this.ordersRepository.findOrderById(orderId);

    const orderConfirmedEvent: OrderConfirmedEvent = {
      orderId: order.id,
      customerId: order.customer.id,
      confirmedAt: new Date().toISOString(),
    };

    await this.rabbitMQPublisher.assertExchange("orders", "topic", {
      durable: true,
    });

    await this.rabbitMQPublisher.publish("orders", orderConfirmedEvent, {
      exchange: "orders",
      routingKey: "order.confirmed",
      messageId: `${order.id}-confirmed`,
    });

    serviceLogger.orders.info(
      {
        orderId: order.id,
        event: "OrderConfirmed",
        exchange: "orders",
        routingKey: "order.confirmed",
      },
      "Evento OrderConfirmed publicado"
    );

    return order;
  }

  async cancelOrder(orderId: string, reason?: string): Promise<Order> {
    await this.ordersRepository.updateOrderStatus(
      orderId,
      OrderStatus.CANCELLED
    );

    const order = await this.ordersRepository.findOrderById(orderId);

    const orderCancelledEvent: OrderCancelledEvent = {
      orderId: order.id,
      customerId: order.customer.id,
      reason,
      cancelledAt: new Date().toISOString(),
    };

    await this.rabbitMQPublisher.assertExchange("orders", "topic", {
      durable: true,
    });

    await this.rabbitMQPublisher.publish("orders", orderCancelledEvent, {
      exchange: "orders",
      routingKey: "order.cancelled",
      messageId: `${order.id}-cancelled`,
    });

    serviceLogger.orders.info(
      {
        orderId: order.id,
        event: "OrderCancelled",
        exchange: "orders",
        routingKey: "order.cancelled",
        reason: reason,
      },
      "Evento OrderCancelled publicado"
    );

    return order;
  }
}
