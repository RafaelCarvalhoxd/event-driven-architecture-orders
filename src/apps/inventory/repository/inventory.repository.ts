import { Database } from "../../../infra/db/postgres/postgres";
import { InventoryMovement } from "../models/inventory";
import * as schemas from "../../../infra/db/postgres/schemas";
import { Product } from "../models/product";
import { and, eq, gt, sql } from "drizzle-orm";
import {
  InternalServerError,
  NotFoundError,
} from "../../../helpers/errors/errors";

export class InventoryRepository {
  constructor(private readonly db: Database) {}

  async findProductById(productId: string): Promise<Product> {
    try {
      const product = await this.db
        .select()
        .from(schemas.products)
        .where(eq(schemas.products.id, productId));
      if (!product) {
        throw new NotFoundError("Product not found!");
      }
      return {
        id: product[0].id,
        name: product[0].name,
        price: product[0].price,
      };
    } catch (error) {
      throw new InternalServerError(`Error finding product by id! ${error}`);
    }
  }

  async createInventoryMovement(
    productId: string,
    quantity: number,
    type: "IN" | "OUT"
  ): Promise<void> {
    try {
      await this.db
        .insert(schemas.inventory)
        .values({
          productId,
          quantity,
          type,
        })
        .returning();
    } catch (error) {
      throw new InternalServerError(
        `Error creating inventory movement! ${error}`
      );
    }
  }

  async getInventoryByProductId(
    productId: string
  ): Promise<InventoryMovement[]> {
    try {
      const inventory = await this.db
        .select({
          productId: schemas.products.id,
          productName: schemas.products.name,
          productPrice: schemas.products.price,
          quantity: schemas.inventory.quantity,
          type: schemas.inventory.type,
        })
        .from(schemas.inventory)
        .leftJoin(
          schemas.products,
          eq(schemas.inventory.productId, schemas.products.id)
        )
        .where(
          and(
            eq(schemas.inventory.productId, productId),
            eq(schemas.products.isActive, true)
          )
        );
      if (!inventory) {
        throw new NotFoundError("No inventory found for this product!");
      }
      return inventory.map(
        (inventory): InventoryMovement => ({
          product: {
            id: inventory.productId ?? "",
            name: inventory.productName ?? "",
            price: inventory.productPrice ?? "",
          },
          quantity: inventory.quantity,
          type: inventory.type as "IN" | "OUT",
        })
      );
    } catch (error) {
      throw new InternalServerError(
        `Error getting inventory by product id! ${error}`
      );
    }
  }

  async getReservedQuantity(productId: string): Promise<number> {
    try {
      const reservations = await this.db
        .select({
          quantity: schemas.inventoryReservations.quantity,
        })
        .from(schemas.inventoryReservations)
        .where(
          and(
            eq(schemas.inventoryReservations.productId, productId),
            eq(schemas.inventoryReservations.status, "PENDING"),
            gt(schemas.inventoryReservations.expiresAt, sql`NOW()`)
          )
        );

      return reservations.reduce((acc, res) => acc + res.quantity, 0);
    } catch (error) {
      throw new InternalServerError(
        `Error getting reserved quantity! ${error}`
      );
    }
  }

  async createReservation(
    productId: string,
    orderId: string,
    quantity: number,
    expiresAt: Date
  ): Promise<string> {
    try {
      const [reservation] = await this.db
        .insert(schemas.inventoryReservations)
        .values({
          productId,
          orderId,
          quantity,
          expiresAt,
          status: "PENDING",
        })
        .returning({ id: schemas.inventoryReservations.id });

      return reservation.id;
    } catch (error) {
      throw new InternalServerError(`Error creating reservation! ${error}`);
    }
  }

  async getReservationById(reservationId: string): Promise<{
    id: string;
    productId: string;
    orderId: string;
    quantity: number;
    status: string;
    expiresAt: Date;
  }> {
    try {
      const [reservation] = await this.db
        .select()
        .from(schemas.inventoryReservations)
        .where(eq(schemas.inventoryReservations.id, reservationId));

      if (!reservation) {
        throw new NotFoundError("Reservation not found");
      }

      return reservation;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new InternalServerError(`Error getting reservation! ${error}`);
    }
  }

  async getReservationsByOrderId(orderId: string): Promise<
    Array<{
      id: string;
      productId: string;
      orderId: string;
      quantity: number;
      status: string;
      expiresAt: Date;
    }>
  > {
    try {
      const reservations = await this.db
        .select()
        .from(schemas.inventoryReservations)
        .where(eq(schemas.inventoryReservations.orderId, orderId));

      return reservations;
    } catch (error) {
      throw new InternalServerError(
        `Error getting reservations by order id! ${error}`
      );
    }
  }

  async updateReservationStatus(
    reservationId: string,
    status: "PENDING" | "CONFIRMED" | "CANCELLED"
  ): Promise<void> {
    try {
      await this.db
        .update(schemas.inventoryReservations)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(schemas.inventoryReservations.id, reservationId));
    } catch (error) {
      throw new InternalServerError(
        `Error updating reservation status! ${error}`
      );
    }
  }

  async updateReservationsStatusByOrderId(
    orderId: string,
    status: "PENDING" | "CONFIRMED" | "CANCELLED"
  ): Promise<void> {
    try {
      await this.db
        .update(schemas.inventoryReservations)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schemas.inventoryReservations.orderId, orderId),
            eq(schemas.inventoryReservations.status, "PENDING")
          )
        );
    } catch (error) {
      throw new InternalServerError(
        `Error updating reservations status by order id! ${error}`
      );
    }
  }
}
