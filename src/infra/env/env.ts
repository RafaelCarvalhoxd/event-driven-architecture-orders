import * as dotenv from "dotenv";

dotenv.config();

export const env = {
  env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 3000,
  db: {
    postgres: {
      host: process.env.DB_POSTGRES_HOST || "localhost",
      port: process.env.DB_POSTGRES_PORT || 5432,
      username: process.env.DB_POSTGRES_USERNAME || "postgres",
      password: process.env.DB_POSTGRES_PASSWORD || "postgres",
      database: process.env.DB_POSTGRES_DATABASE || "postgres",
    },
    redis: {
      host: process.env.DB_REDIS_HOST || "localhost",
      port: process.env.DB_REDIS_PORT || 6379,
      password: process.env.DB_REDIS_PASSWORD || undefined,
    },
  },
  mail: {
    host: process.env.MAIL_HOST || "smtp.gmail.com",
    port: process.env.MAIL_PORT || 587,
    user: process.env.MAIL_USER || "your-email@gmail.com",
    pass: process.env.MAIL_PASS || "your-password",
  },
  log: {
    level: process.env.LOG_LEVEL || "info",
  },
  messaging: {
    rabbitmq: {
      url:
        process.env.RABBITMQ_URL ||
        `amqp://${process.env.RABBITMQ_USERNAME || "guest"}:${
          process.env.RABBITMQ_PASSWORD || "guest"
        }@${process.env.RABBITMQ_HOST || "localhost"}:${
          process.env.RABBITMQ_PORT || 5672
        }`,
    },
  },
};
