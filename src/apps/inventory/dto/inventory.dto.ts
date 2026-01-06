import { z } from "zod";

export const createInventoryMovementSchema = z.object({
  productId: z.uuid("Product ID must be a valid UUID"),
  quantity: z.number().positive("Quantity must be a positive number"),
  type: z.enum(["IN", "OUT"], {
    message: "Type must be 'IN' or 'OUT'",
  }),
});

export const getProductDisponibilitySchema = z.object({
  id: z.uuid("Product ID must be a valid UUID"),
});

export const reserveProductSchema = z.object({
  productId: z.uuid("Product ID must be a valid UUID"),
  orderId: z.uuid("Order ID must be a valid UUID"),
  quantity: z.number().positive("Quantity must be a positive number"),
  expiresInMinutes: z.number().positive().default(30),
});

export type CreateInventoryMovementDTO = z.infer<
  typeof createInventoryMovementSchema
>;
export type GetProductDisponibilityDTO = z.infer<
  typeof getProductDisponibilitySchema
>;
export type ReserveProductDTO = z.infer<typeof reserveProductSchema>;
