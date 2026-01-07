import pino from "pino";
import { env } from "../env/env";

const isDevelopment = env.env !== "production";

export const logger = pino({
  level: env.log.level || (isDevelopment ? "debug" : "info"),
  transport: isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  base: {
    env: env.env,
    service: "eda-orders",
  },
});

export type Logger = typeof logger;

export function createLogger(context: Record<string, unknown>): Logger {
  return logger.child(context);
}

export const serviceLogger = {
  orders: logger.child({ service: "orders" }),
  inventory: logger.child({ service: "inventory" }),
  payment: logger.child({ service: "payment" }),
  notification: logger.child({ service: "notification" }),
};

export const infraLogger = {
  database: logger.child({ component: "database" }),
  redis: logger.child({ component: "redis" }),
  rabbitmq: logger.child({ component: "rabbitmq" }),
  idempotency: logger.child({ component: "idempotency" }),
};
