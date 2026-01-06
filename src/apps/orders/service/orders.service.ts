import { Order } from "../models/orders";
import { OrdersRepository } from "../repository/orders.repository";
import { CreateOrderDTO, UpdateOrderStatusDTO, GetOrderByIdDTO } from "../dto";
import { OrderStatus } from "../enums/order-status.enum";

export class OrdersService {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async createOrder(data: CreateOrderDTO): Promise<Order> {
    const orderData = {
      ...data,
      status: data.status as OrderStatus,
    };
    return await this.ordersRepository.createOrder(orderData);
  }

  async updateOrderStatus(
    id: string,
    data: UpdateOrderStatusDTO
  ): Promise<void> {
    return await this.ordersRepository.updateOrderStatus(
      id,
      data.status as OrderStatus
    );
  }

  async findOrderById(data: GetOrderByIdDTO): Promise<Order> {
    return await this.ordersRepository.findOrderById(data.id);
  }
}
