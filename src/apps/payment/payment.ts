import { db } from "../../infra/db/postgres/postgres";
import { PaymentRepository } from "./repository/payment.repository";
import { PaymentService } from "./service/payment.service";
import { SimulatedPaymentGateway } from "./gateway/payment.gateway";
import { RabbitMQPublisher } from "../../infra/messaging/rabbitmq/publisher";
import { OrdersRepository } from "../orders/repository/orders.repository";
import { InventoryRepository } from "../inventory/repository/inventory.repository";

export const payment = {
  createPaymentService: () => {
    const paymentRepository = new PaymentRepository(db);
    const paymentGateway = new SimulatedPaymentGateway();
    const rabbitMQPublisher = new RabbitMQPublisher();
    const ordersRepository = new OrdersRepository(db);
    const inventoryRepository = new InventoryRepository(db);
    return new PaymentService(
      paymentRepository,
      paymentGateway,
      rabbitMQPublisher,
      ordersRepository,
      inventoryRepository
    );
  },
};
