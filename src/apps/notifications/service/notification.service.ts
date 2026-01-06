import { InternalServerError } from "../../../helpers/errors/errors";
import { Order } from "../../orders/models/orders";
import { MailLib } from "../lib/mail/mail.lib";

export class NotificationService {
  constructor(private readonly mailLib: MailLib) {}

  async sendOrderConfirmationEmail(order: Order): Promise<boolean> {
    try {
      await this.mailLib.sendEmail(
        order.customer.email,
        "Order Confirmation",
        `Your order has been confirmed. Order ID: ${order.id}`
      );
      return true;
    } catch (error) {
      throw new InternalServerError(
        `Error sending order confirmation email! ${error}`
      );
    }
  }

  async sendOrderCancelledEmail(order: Order): Promise<boolean> {
    try {
      await this.mailLib.sendEmail(
        order.customer.email,
        "Order Cancelled",
        `Your order has been cancelled. Order ID: ${order.id}`
      );
      return true;
    } catch (error) {
      throw new InternalServerError(
        `Error sending order cancelled email! ${error}`
      );
    }
  }
}
