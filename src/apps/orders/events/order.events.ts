export interface OrderCreatedEvent {
  orderId: string;
  customerId: string;
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
}

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

export interface OrderConfirmedEvent {
  orderId: string;
  customerId: string;
  confirmedAt: string;
}

export interface OrderCancelledEvent {
  orderId: string;
  customerId: string;
  reason?: string;
  cancelledAt: string;
}
