import { NextFunction, Request, Response, Router } from "express";
import { inventory } from "../inventory";
import {
  createInventoryMovementSchema,
  getProductDisponibilitySchema,
} from "../dto";
import { BadRequestError } from "../../../helpers/errors/errors";

export const inventoryRouter = Router();

inventoryRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const inventoryService = inventory.createInventoryService();
      const validation = createInventoryMovementSchema.safeParse(req.body);
      if (!validation.success) {
        throw new BadRequestError(
          validation.error.issues[0]?.message || "Invalid request data"
        );
      }
      await inventoryService.createInventoryMovement(validation.data);
      res
        .status(201)
        .json({ message: "Inventory movement created successfully" });
    } catch (error) {
      next(error);
    }
  }
);

inventoryRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const inventoryService = inventory.createInventoryService();
      const validation = getProductDisponibilitySchema.safeParse({
        id: req.params.id,
      });
      if (!validation.success) {
        throw new BadRequestError(
          validation.error.issues[0]?.message || "Invalid product ID"
        );
      }
      const inventoryMovement = await inventoryService.getProductDisponibility(
        validation.data
      );
      res.status(200).json(inventoryMovement);
    } catch (error) {
      next(error);
    }
  }
);
