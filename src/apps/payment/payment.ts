import { db } from "../../infra/db/postgres/postgres";
import { PaymentRepository } from "./repository/payment.repository";
import { PaymentService } from "./service/payment.service";
import { SimulatedPaymentGateway } from "./gateway/payment.gateway";

export const payment = {
  createPaymentService: () => {
    const paymentRepository = new PaymentRepository(db);
    const paymentGateway = new SimulatedPaymentGateway();
    return new PaymentService(paymentRepository, paymentGateway);
  },
};
