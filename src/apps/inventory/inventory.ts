import { db } from "../../infra/db/postgres/postgres";
import { InventoryRepository } from "./repository/inventory.repository";
import { InventoryService } from "./service/inventory.service";
import { InventoryWorker } from "./worker/inventory.worker";
import { orders } from "../orders/orders";

export const inventory = {
  createInventoryService: () => {
    const inventoryRepository = new InventoryRepository(db);
    return new InventoryService(inventoryRepository);
  },

  createInventoryWorker: () => {
    const inventoryService = inventory.createInventoryService();
    const ordersService = orders.createOrdersService();
    return new InventoryWorker(inventoryService, ordersService);
  },
};
