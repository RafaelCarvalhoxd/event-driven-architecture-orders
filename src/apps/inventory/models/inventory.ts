import { Product } from "./product";

export interface InventoryMovement {
  product: Product;
  quantity: number;
  type: "IN" | "OUT";
}
