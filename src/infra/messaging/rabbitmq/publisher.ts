import { Channel } from "amqplib";
import { connectRabbitMQ } from "./connection";

export interface PublishOptions {
  exchange?: string;
  routingKey?: string;
  persistent?: boolean;
}

export class RabbitMQPublisher {
  private channel: Channel | null = null;

  async connect(): Promise<void> {
    this.channel = await connectRabbitMQ();
  }

  async publish(
    queueOrExchange: string,
    message: unknown,
    options: PublishOptions = {}
  ): Promise<boolean> {
    if (!this.channel) {
      this.channel = await connectRabbitMQ();
    }

    const {
      exchange = "",
      routingKey = queueOrExchange,
      persistent = true,
    } = options;

    const messageBuffer = Buffer.from(JSON.stringify(message));

    if (exchange) {
      return this.channel.publish(exchange, routingKey, messageBuffer, {
        persistent,
      });
    } else {
      await this.channel.assertQueue(queueOrExchange, { durable: true });
      return this.channel.sendToQueue(queueOrExchange, messageBuffer, {
        persistent,
      });
    }
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

  async bindQueue(
    queue: string,
    exchange: string,
    routingKey: string = ""
  ): Promise<void> {
    if (!this.channel) {
      this.channel = await connectRabbitMQ();
    }

    await this.channel.bindQueue(queue, exchange, routingKey);
  }
}
