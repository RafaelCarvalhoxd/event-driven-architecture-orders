import { PaymentStatus } from "../enums/payment.enum";

export interface Payment {
  id: string;
  orderId: string;
  amount: string;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}
