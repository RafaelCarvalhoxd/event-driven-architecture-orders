import { NotificationService } from "./service/notification.service";
import { MailLib } from "./lib/mail/mail.lib";

export const notifications = {
  createNotificationService: () => {
    const mailLib = new MailLib();
    return new NotificationService(mailLib);
  },
};
