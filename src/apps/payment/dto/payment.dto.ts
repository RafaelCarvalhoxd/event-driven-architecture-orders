import { z } from "zod";
import { PaymentStatus } from "../enums/payment.enum";

export const processPaymentSchema = z.object({
  orderId: z.uuid("Order ID must be a valid UUID"),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid decimal number"),
});

export const getPaymentByIdSchema = z.object({
  id: z.uuid("Payment ID must be a valid UUID"),
});

export const updatePaymentStatusSchema = z.object({
  status: z.enum(PaymentStatus),
});

export type ProcessPaymentDTO = z.infer<typeof processPaymentSchema>;
export type GetPaymentByIdDTO = z.infer<typeof getPaymentByIdSchema>;
export type UpdatePaymentStatusDTO = z.infer<typeof updatePaymentStatusSchema>;
