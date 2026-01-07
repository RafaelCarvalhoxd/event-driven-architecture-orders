import { NotificationService } from "./service/notification.service";
import { MailLib } from "./lib/mail/mail.lib";
import { NotificationWorker } from "./worker/notification.worker";
import { OrdersRepository } from "../orders/repository/orders.repository";
import { db } from "../../infra/db/postgres/postgres";

export const notifications = {
  createNotificationService: () => {
    const mailLib = new MailLib();
    return new NotificationService(mailLib);
  },

  createNotificationWorker: () => {
    const notificationService = notifications.createNotificationService();
    const ordersRepository = new OrdersRepository(db);
    return new NotificationWorker(notificationService, ordersRepository);
  },
};
