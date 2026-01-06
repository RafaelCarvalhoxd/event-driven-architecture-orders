import { OrderStatus } from "../enums/order-status.enum";

export interface Order {
  id: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  status: OrderStatus;
  items: Array<{
    product: {
      id: string;
      name: string;
    };
    quantity: number;
    price: number;
  }>;
  totalAmount: string;
  createdAt: string;
  updatedAt: string;
}
