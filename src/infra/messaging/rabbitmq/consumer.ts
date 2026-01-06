import { Channel, ConsumeMessage } from "amqplib";
import { connectRabbitMQ } from "./connection";

export interface ConsumeOptions {
  exchange?: string;
  routingKey?: string;
  noAck?: boolean;
  prefetch?: number;
}

export type MessageHandler = (
  message: unknown,
  rawMessage: ConsumeMessage
) => Promise<void> | void;

export class RabbitMQConsumer {
  private channel: Channel | null = null;

  async connect(): Promise<void> {
    this.channel = await connectRabbitMQ();
  }

  async consume(
    queue: string,
    handler: MessageHandler,
    options: ConsumeOptions = {}
  ): Promise<void> {
    if (!this.channel) {
      this.channel = await connectRabbitMQ();
    }

    const { exchange, routingKey, noAck = false, prefetch = 1 } = options;

    await this.channel.prefetch(prefetch);

    await this.channel.assertQueue(queue, { durable: true });

    if (exchange) {
      await this.channel.assertExchange(exchange, "topic", { durable: true });
      await this.channel.bindQueue(queue, exchange, routingKey || "");
    }

    await this.channel.consume(
      queue,
      async (rawMessage) => {
        if (!rawMessage) {
          return;
        }

        try {
          const message = JSON.parse(rawMessage.content.toString());
          await handler(message, rawMessage);

          if (!noAck) {
            this.channel?.ack(rawMessage);
          }
        } catch (error) {
          console.error(`Error processing message from queue ${queue}:`, error);

          if (!noAck) {
            this.channel?.nack(rawMessage, false, false);
          }
        }
      },
      { noAck }
    );

    console.log(`✅ Consumer started for queue: ${queue}`);
  }

  async assertQueue(
    name: string,
    options: { durable?: boolean } = {}
  ): Promise<void> {
    if (!this.channel) {
      this.channel = await connectRabbitMQ();
    }

    await this.channel.assertQueue(name, {
      durable: options.durable ?? true,
    });
  }

  async assertExchange(
    name: string,
    type: "direct" | "topic" | "fanout" | "headers" = "topic",
    options: { durable?: boolean } = {}
  ): Promise<void> {
    if (!this.channel) {
      this.channel = await connectRabbitMQ();
    }

    await this.channel.assertExchange(name, type, {
      durable: options.durable ?? true,
    });
  }
}
