export interface PaymentConfirmedEvent {
  orderId: string;
  paymentId: string;
  amount: string;
  confirmedAt: string;
}

export interface PaymentFailedEvent {
  orderId: string;
  paymentId: string;
  amount: string;
  reason?: string;
  failedAt: string;
}
