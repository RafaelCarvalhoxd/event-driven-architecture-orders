import {
  InternalServerError,
  NotFoundError,
} from "../../../helpers/errors/errors";
import { Database } from "../../../infra/db/postgres/postgres";
import { Payment } from "../models/payment";
import * as schemas from "../../../infra/db/postgres/schemas";
import { PaymentStatus } from "../enums/payment.enum";
import { eq } from "drizzle-orm";

export class PaymentRepository {
  constructor(private readonly db: Database) {}

  async findPaymentById(id: string): Promise<Payment> {
    try {
      const [payment] = await this.db
        .select({
          id: schemas.payment.id,
          orderId: schemas.payment.orderId,
          amount: schemas.payment.amount,
          status: schemas.payment.status,
          createdAt: schemas.payment.createdAt,
          updatedAt: schemas.payment.updatedAt,
        })
        .from(schemas.payment)
        .where(eq(schemas.payment.id, id));

      if (!payment) {
        throw new NotFoundError("Payment not found!");
      }

      return {
        id: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        status: payment.status as PaymentStatus,
        createdAt: payment.createdAt.toISOString(),
        updatedAt: payment.updatedAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new InternalServerError(`Error finding payment by id! ${error}`);
    }
  }

  async createPayment(data: {
    orderId: string;
    amount: string;
  }): Promise<Payment> {
    try {
      const [payment] = await this.db
        .insert(schemas.payment)
        .values({
          orderId: data.orderId,
          amount: data.amount,
          status: PaymentStatus.PENDING,
        })
        .returning({
          id: schemas.payment.id,
          orderId: schemas.payment.orderId,
          amount: schemas.payment.amount,
          status: schemas.payment.status,
          createdAt: schemas.payment.createdAt,
          updatedAt: schemas.payment.updatedAt,
        });

      return {
        id: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        status: payment.status as PaymentStatus,
        createdAt: payment.createdAt.toISOString(),
        updatedAt: payment.updatedAt.toISOString(),
      };
    } catch (error) {
      throw new InternalServerError(`Error creating payment! ${error}`);
    }
  }

  async updatePaymentStatus(id: string, status: PaymentStatus): Promise<void> {
    try {
      await this.db
        .update(schemas.payment)
        .set({ status, updatedAt: new Date() })
        .where(eq(schemas.payment.id, id));
    } catch (error) {
      throw new InternalServerError(`Error updating payment status! ${error}`);
    }
  }
}
