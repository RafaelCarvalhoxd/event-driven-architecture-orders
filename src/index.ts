import express, { NextFunction, Request, Response, Router } from "express";
import { env } from "./infra/env/env";
import { connectDatabase } from "./infra/db/postgres/postgres";
import { connectRedis } from "./infra/db/redis/redis";
import { HttpError } from "./helpers/errors/errors";
import { inventoryRouter } from "./apps/inventory/handler/inventory.handler";
import { ordersRouter } from "./apps/orders/handler/orders.handler";
import { paymentRouter } from "./apps/payment/handler/payment.handler";
import { connectRabbitMQ } from "./infra/messaging/rabbitmq/connection";
import { logger } from "./infra/logger/logger";
import pinoHttp from "pino-http";
import { orders } from "./apps/orders/orders";
import { inventory } from "./apps/inventory/inventory";
import { notifications } from "./apps/notifications/notification";

const app = express();

app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req: Request) => req.url === "/health",
    },
  })
);

app.use(express.json());
app.use("/api/v1", setupRoutes());
app.use(errorHandler);

async function startServer(): Promise<void> {
  try {
    logger.info("Iniciando servidor...");

    await connectDatabase();
    await connectRedis();
    await connectRabbitMQ();

    logger.info("Iniciando workers...");

    await orders.createOrdersWorker().start();
    await inventory.createInventoryWorker().start();
    await notifications.createNotificationWorker().start();

    logger.info("Todos os workers iniciados com sucesso");

    app.listen(env.port, () => {
      logger.info({ port: env.port }, "Servidor iniciado e escutando");
    });
  } catch (error) {
    logger.fatal(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Falha ao iniciar o servidor"
    );
    process.exit(1);
  }
}

startServer();

function setupRoutes(): Router {
  const router = Router();
  router.get("/", (req, res) => {
    res.send("Hello World");
  });
  router.use("/inventory", inventoryRouter);
  router.use("/orders", ordersRouter);
  router.use("/payments", paymentRouter);
  return router;
}

function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ error: err.message });
  } else {
    res.status(500).json({ error: "Internal Server Error" });
  }
}
