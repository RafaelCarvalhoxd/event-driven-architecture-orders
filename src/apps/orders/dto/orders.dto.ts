import { z } from "zod";
import { OrderStatus } from "../enums/order-status.enum";

const orderItemSchema = z.object({
  product: z.object({
    id: z.uuid("Product ID must be a valid UUID"),
  }),
  quantity: z.number().positive("Quantity must be a positive number"),
  price: z.number().positive("Price must be a positive number"),
});

export const createOrderSchema = z.object({
  customerId: z.uuid("Customer ID must be a valid UUID"),
  status: z.enum(OrderStatus),
  items: z.array(orderItemSchema).min(1, "Order must have at least one item"),
  totalAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Total amount must be a valid decimal number"),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(OrderStatus),
});

export const getOrderByIdSchema = z.object({
  id: z.uuid("Order ID must be a valid UUID"),
});

export type CreateOrderDTO = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusDTO = z.infer<typeof updateOrderStatusSchema>;
export type GetOrderByIdDTO = z.infer<typeof getOrderByIdSchema>;
