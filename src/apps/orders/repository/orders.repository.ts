import {
  InternalServerError,
  NotFoundError,
} from "../../../helpers/errors/errors";
import { Database } from "../../../infra/db/postgres/postgres";
import { Order } from "../models/orders";
import * as schemas from "../../../infra/db/postgres/schemas";
import { OrderStatus } from "../enums/order-status.enum";
import { eq } from "drizzle-orm";

export class OrdersRepository {
  constructor(private readonly db: Database) {}

  async findOrderById(id: string): Promise<Order> {
    try {
      const orderRows = await this.db
        .select({
          id: schemas.orders.id,
          customerId: schemas.orders.customerId,
          customerName: schemas.customers.name,
          customerEmail: schemas.customers.email,
          status: schemas.orders.status,
          productId: schemas.orderItems.productId,
          productName: schemas.products.name,
          productPriceOnOrder: schemas.orderItems.price,
          productQuantityOnOrder: schemas.orderItems.quantity,
          totalAmount: schemas.orders.totalAmount,
          createdAt: schemas.orders.createdAt,
          updatedAt: schemas.orders.updatedAt,
        })
        .from(schemas.orders)
        .leftJoin(
          schemas.orderItems,
          eq(schemas.orders.id, schemas.orderItems.orderId)
        )
        .leftJoin(
          schemas.customers,
          eq(schemas.orders.customerId, schemas.customers.id)
        )
        .leftJoin(
          schemas.products,
          eq(schemas.orderItems.productId, schemas.products.id)
        )
        .where(eq(schemas.orders.id, id));

      if (orderRows.length === 0) {
        throw new NotFoundError("Order not found!");
      }

      const firstRow = orderRows[0];

      const itemsMap = new Map<
        string,
        {
          product: {
            id: string;
            name: string;
          };
          quantity: number;
          price: number;
        }
      >();

      for (const row of orderRows) {
        if (row.productId && row.productName) {
          itemsMap.set(row.productId, {
            product: {
              id: row.productId,
              name: row.productName,
            },
            quantity: row.productQuantityOnOrder ?? 0,
            price: parseFloat(row.productPriceOnOrder ?? "0"),
          });
        }
      }

      return {
        id: firstRow.id,
        customer: {
          id: firstRow.customerId,
          name: firstRow.customerName ?? "",
          email: firstRow.customerEmail ?? "",
        },
        status: firstRow.status as OrderStatus,
        items: Array.from(itemsMap.values()),
        totalAmount: firstRow.totalAmount,
        createdAt: firstRow.createdAt.toISOString(),
        updatedAt: firstRow.updatedAt.toISOString(),
      };
    } catch (error) {
      throw new InternalServerError(`Error finding order by id! ${error}`);
    }
  }

  async createOrder(data: {
    customerId: string;
    status: OrderStatus;
    items: Array<{
      product: {
        id: string;
      };
      quantity: number;
      price: number;
    }>;
    totalAmount: string;
  }): Promise<Order> {
    try {
      const orderTransaction = await this.db.transaction(async (tx) => {
        const [order] = await tx
          .insert(schemas.orders)
          .values({
            customerId: data.customerId,
            status: data.status,
            totalAmount: data.totalAmount,
          })
          .returning({
            id: schemas.orders.id,
          });

        await tx.insert(schemas.orderItems).values(
          data.items.map((item) => ({
            orderId: order.id,
            productId: item.product.id,
            quantity: item.quantity,
            price: item.price.toString(),
          }))
        );
        return order;
      });
      return await this.findOrderById(orderTransaction.id);
    } catch (error) {
      throw new InternalServerError(`Error creating order! ${error}`);
    }
  }

  async updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
    try {
      await this.db
        .update(schemas.orders)
        .set({ status })
        .where(eq(schemas.orders.id, id));
    } catch (error) {
      throw new InternalServerError(`Error updating order status! ${error}`);
    }
  }
}
