import { NextFunction, Request, Response, Router } from "express";
import { payment } from "../payment";
import { processPaymentSchema, getPaymentByIdSchema } from "../dto";
import { BadRequestError } from "../../../helpers/errors/errors";

export const paymentRouter = Router();

paymentRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const paymentService = payment.createPaymentService();
      const validation = processPaymentSchema.safeParse(req.body);
      if (!validation.success) {
        throw new BadRequestError(
          validation.error.issues[0]?.message || "Invalid request data"
        );
      }
      const paymentResult = await paymentService.processPayment(
        validation.data
      );
      res.status(201).json(paymentResult);
    } catch (error) {
      next(error);
    }
  }
);

paymentRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const paymentService = payment.createPaymentService();
      const validation = getPaymentByIdSchema.safeParse({
        id: req.params.id,
      });
      if (!validation.success) {
        throw new BadRequestError(
          validation.error.issues[0]?.message || "Invalid payment ID"
        );
      }
      const paymentResult = await paymentService.findPaymentById(
        validation.data.id
      );
      res.status(200).json(paymentResult);
    } catch (error) {
      next(error);
    }
  }
);
