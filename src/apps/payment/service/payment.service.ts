import { PaymentStatus } from "../enums/payment.enum";
import { Payment } from "../models/payment";
import { PaymentRepository } from "../repository/payment.repository";
import { ProcessPaymentDTO } from "../dto";
import { PaymentGateway } from "../gateway/payment.gateway";

export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentGateway: PaymentGateway
  ) {}

  async processPayment(data: ProcessPaymentDTO): Promise<Payment> {
    const payment = await this.paymentRepository.createPayment({
      orderId: data.orderId,
      amount: data.amount,
    });

    const paymentGatewayResponse = await this.paymentGateway.processPayment(
      payment
    );

    if (paymentGatewayResponse.status === PaymentStatus.CONFIRMED) {
      await this.paymentRepository.updatePaymentStatus(
        payment.id,
        PaymentStatus.CONFIRMED
      );
    } else {
      await this.paymentRepository.updatePaymentStatus(
        payment.id,
        PaymentStatus.CANCELLED
      );
    }

    return await this.paymentRepository.findPaymentById(payment.id);
  }

  async findPaymentById(id: string): Promise<Payment> {
    return await this.paymentRepository.findPaymentById(id);
  }
}
