import * as dotenv from "dotenv";

dotenv.config();

export const env = {
  port: process.env.PORT || 3000,
  db: {
    postgres: {
      host: process.env.DB_POSTGRES_HOST || "localhost",
      port: process.env.DB_POSTGRES_PORT || 5432,
      username: process.env.DB_POSTGRES_USERNAME || "postgres",
      password: process.env.DB_POSTGRES_PASSWORD || "postgres",
      database: process.env.DB_POSTGRES_DATABASE || "postgres",
    },
  },
  mail: {
    host: process.env.MAIL_HOST || "smtp.gmail.com",
    port: process.env.MAIL_PORT || 587,
    user: process.env.MAIL_USER || "your-email@gmail.com",
    pass: process.env.MAIL_PASS || "your-password",
  },
};
