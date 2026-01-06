import { InventoryRepository } from "../repository/inventory.repository";
import {
  CreateInventoryMovementDTO,
  GetProductDisponibilityDTO,
  ReserveProductDTO,
} from "../dto";
import { InventoryMovement } from "../models/inventory";
import { BadRequestError } from "../../../helpers/errors/errors";

export class InventoryService {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  async createInventoryMovement(
    data: CreateInventoryMovementDTO
  ): Promise<void> {
    await this.inventoryRepository.findProductById(data.productId);
    await this.inventoryRepository.createInventoryMovement(
      data.productId,
      data.quantity,
      data.type
    );
  }

  async getAvailableQuantity(productId: string): Promise<number> {
    const inventory = await this.inventoryRepository.getInventoryByProductId(
      productId
    );
    const totalInventoryIn = inventory
      .filter((inv) => inv.type === "IN")
      .reduce((acc, inv) => acc + inv.quantity, 0);
    const totalInventoryOut = inventory
      .filter((inv) => inv.type === "OUT")
      .reduce((acc, inv) => acc + inv.quantity, 0);

    const reservedQuantity = await this.inventoryRepository.getReservedQuantity(
      productId
    );

    return totalInventoryIn - totalInventoryOut - reservedQuantity;
  }

  async getProductDisponibility(
    data: GetProductDisponibilityDTO
  ): Promise<InventoryMovement> {
    const product = await this.inventoryRepository.findProductById(data.id);
    const availableQuantity = await this.getAvailableQuantity(data.id);
    return {
      product: product,
      quantity: availableQuantity,
      type: "IN",
    };
  }

  async reserveProduct(data: ReserveProductDTO): Promise<string> {
    await this.inventoryRepository.findProductById(data.productId);

    const availableQuantity = await this.getAvailableQuantity(data.productId);
    if (availableQuantity < data.quantity) {
      throw new BadRequestError(
        `Insufficient inventory. Available: ${availableQuantity}, Requested: ${data.quantity}`
      );
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + (data.expiresInMinutes || 30)
    );

    return await this.inventoryRepository.createReservation(
      data.productId,
      data.orderId,
      data.quantity,
      expiresAt
    );
  }

  async confirmReservationsByOrderId(orderId: string): Promise<void> {
    const reservations =
      await this.inventoryRepository.getReservationsByOrderId(orderId);

    const pendingReservations = reservations.filter(
      (res) => res.status === "PENDING"
    );

    for (const reservation of pendingReservations) {
      await this.inventoryRepository.updateReservationStatus(
        reservation.id,
        "CONFIRMED"
      );

      await this.inventoryRepository.createInventoryMovement(
        reservation.productId,
        reservation.quantity,
        "OUT"
      );
    }
  }

  async releaseReservationsByOrderId(orderId: string): Promise<void> {
    await this.inventoryRepository.updateReservationsStatusByOrderId(
      orderId,
      "CANCELLED"
    );
  }
}
