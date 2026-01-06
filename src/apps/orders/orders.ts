import { db } from "../../infra/db/postgres/postgres";
import { OrdersRepository } from "./repository/orders.repository";
import { OrdersService } from "./service/orders.service";

export const orders = {
  createOrdersService: () => {
    const ordersRepository = new OrdersRepository(db);
    return new OrdersService(ordersRepository);
  },
};


