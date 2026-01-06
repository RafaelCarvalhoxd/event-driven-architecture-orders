import { PaymentStatus } from "../enums/payment.enum";
import { Payment } from "../models/payment";

export interface PaymentGatewayResponse {
  status: PaymentStatus;
  transactionId: string;
  message: string;
}

export interface PaymentGateway {
  processPayment(payment: Payment): Promise<PaymentGatewayResponse>;
}

export class SimulatedPaymentGateway implements PaymentGateway {
  async processPayment(payment: Payment): Promise<PaymentGatewayResponse> {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const isSuccess = Math.random() > 0.1;

    if (isSuccess) {
      return {
        status: PaymentStatus.CONFIRMED,
        transactionId: `TXN-${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}`,
        message: `${payment.id} - Payment processed successfully`,
      };
    } else {
      return {
        status: PaymentStatus.CANCELLED,
        transactionId: `TXN-${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}`,
        message: `${payment.id} - Payment processing failed`,
      };
    }
  }
}
