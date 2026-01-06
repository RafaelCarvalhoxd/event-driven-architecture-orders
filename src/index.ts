import express, { NextFunction, Request, Response, Router } from "express";
import { env } from "./infra/env/env";
import { connectDatabase } from "./infra/db/postgres/postgres";
import { HttpError } from "./helpers/errors/errors";
import { inventoryRouter } from "./apps/inventory/handler/inventory.handler";
import { ordersRouter } from "./apps/orders/handler/orders.handler";
import { connectRabbitMQ } from "./infra/messaging/rabbitmq/connection";

const app = express();

app.use(express.json());
app.use("/api/v1", setupRoutes());
app.use(errorHandler);

async function startServer(): Promise<void> {
  try {
    await connectDatabase();
    await connectRabbitMQ();
    app.listen(env.port, () => {
      console.log(`🚀 Server is running on port ${env.port}`);
    });
  } catch (error) {
    console.error("❌ Falha ao iniciar o servidor:", error);
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
