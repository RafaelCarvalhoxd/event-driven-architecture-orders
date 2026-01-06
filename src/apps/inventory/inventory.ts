import { db } from "../../infra/db/postgres/postgres";
import { InventoryRepository } from "./repository/inventory.repository";
import { InventoryService } from "./service/inventory.service";

export const inventory = {
  createInventoryService: () => {
    const inventoryRepository = new InventoryRepository(db);
    return new InventoryService(inventoryRepository);
  },
};
