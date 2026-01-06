import { NextFunction, Request, Response, Router } from "express";
import { orders } from "../orders";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  getOrderByIdSchema,
} from "../dto";
import { BadRequestError } from "../../../helpers/errors/errors";
import { OrderStatus } from "../enums/order-status.enum";

export const ordersRouter = Router();

ordersRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ordersService = orders.createOrdersService();
      const validation = createOrderSchema.safeParse(req.body);
      if (!validation.success) {
        throw new BadRequestError(
          validation.error.issues[0]?.message || "Invalid request data"
        );
      }
      const order = await ordersService.createOrder(validation.data);
      res.status(201).json(order);
    } catch (error) {
      next(error);
    }
  }
);

ordersRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ordersService = orders.createOrdersService();
      const validation = getOrderByIdSchema.safeParse({
        id: req.params.id,
      });
      if (!validation.success) {
        throw new BadRequestError(
          validation.error.issues[0]?.message || "Invalid order ID"
        );
      }
      const order = await ordersService.findOrderById(validation.data);
      res.status(200).json(order);
    } catch (error) {
      next(error);
    }
  }
);

ordersRouter.patch(
  "/:id/status",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ordersService = orders.createOrdersService();
      const idValidation = getOrderByIdSchema.safeParse({
        id: req.params.id,
      });
      if (!idValidation.success) {
        throw new BadRequestError(
          idValidation.error.issues[0]?.message || "Invalid order ID"
        );
      }
      const statusValidation = updateOrderStatusSchema.safeParse(req.body);
      if (!statusValidation.success) {
        throw new BadRequestError(
          statusValidation.error.issues[0]?.message || "Invalid status"
        );
      }
      await ordersService.updateOrderStatus(idValidation.data.id, {
        status: statusValidation.data.status as OrderStatus,
      });
      res.status(200).json({ message: "Order status updated successfully" });
    } catch (error) {
      next(error);
    }
  }
);
