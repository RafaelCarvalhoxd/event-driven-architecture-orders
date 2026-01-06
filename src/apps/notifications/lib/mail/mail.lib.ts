import { env } from "../../../../infra/env/env";
import nodemailer from "nodemailer";

export class MailLib {
  async sendEmail(to: string, subject: string, text: string): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: env.mail.host,
      port: Number(env.mail.port),
      auth: {
        user: env.mail.user,
        pass: env.mail.pass,
      },
    });

    const mailOptions = {
      from: env.mail.user,
      to,
      subject,
      text,
    };

    await transporter.sendMail(mailOptions);
  }
}
