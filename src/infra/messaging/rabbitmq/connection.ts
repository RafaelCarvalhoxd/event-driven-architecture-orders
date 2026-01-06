import amqp, { Channel } from "amqplib";
import { env } from "../../env/env";

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
      console.error("RabbitMQ connection error:", err);
      connection = null;
      channel = null;
    });

    connection.on("close", () => {
      console.log("RabbitMQ connection closed");
      connection = null;
      channel = null;
    });

    console.log("✅ Connected to RabbitMQ");
    if (!channel) {
      throw new Error("Failed to create channel");
    }
    return channel;
  } catch (error) {
    console.error("Failed to connect to RabbitMQ:", error);
    connection = null;
    channel = null;
    throw error;
  }
}
