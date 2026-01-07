import amqp, { Channel } from "amqplib";
import { env } from "../../env/env";
import { infraLogger } from "../../logger/logger";

type RabbitMQConnection = Awaited<ReturnType<typeof amqp.connect>>;

let channel: Channel | null = null;
let connection: RabbitMQConnection | null = null;

export async function connectRabbitMQ(): Promise<Channel> {
  if (channel && connection) {
    return channel;
  }

  try {
    connection = await amqp.connect(env.messaging.rabbitmq.url);
    channel = await connection.createChannel();

    connection.on("error", (err: Error) => {
      infraLogger.rabbitmq.error(
        { error: err.message },
        "Erro na conexão RabbitMQ"
      );
      connection = null;
      channel = null;
    });

    connection.on("close", () => {
      infraLogger.rabbitmq.warn("Conexão RabbitMQ fechada");
      connection = null;
      channel = null;
    });

    infraLogger.rabbitmq.info("Conectado ao RabbitMQ");
    if (!channel) {
      throw new Error("Failed to create channel");
    }
    return channel;
  } catch (error) {
    infraLogger.rabbitmq.error(
      {
        error: error instanceof Error ? error.message : String(error),
        url: env.messaging.rabbitmq.url.replace(/:[^:]*@/, ":****@"),
      },
      "Falha ao conectar ao RabbitMQ"
    );
    connection = null;
    channel = null;
    throw error;
  }
}
