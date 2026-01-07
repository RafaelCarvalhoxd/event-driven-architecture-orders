import { db } from "../../infra/db/postgres/postgres";
import { RabbitMQPublisher } from "../../infra/messaging/rabbitmq/publisher";
import { OrdersRepository } from "./repository/orders.repository";
import { OrdersService } from "./service/orders.service";
import { OrdersWorker } from "./worker/orders.worker";

export const orders = {
  createOrdersService: () => {
    const ordersRepository = new OrdersRepository(db);
    const rabbitMQPublisher = new RabbitMQPublisher();
    return new OrdersService(ordersRepository, rabbitMQPublisher);
  },

  createOrdersWorker: () => {
    const ordersService = orders.createOrdersService();
    return new OrdersWorker(ordersService);
  },
};
