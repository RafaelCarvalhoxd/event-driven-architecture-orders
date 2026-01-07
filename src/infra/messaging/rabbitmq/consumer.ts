import { Channel, ConsumeMessage } from "amqplib";
import { connectRabbitMQ } from "./connection";
import { Idempotency } from "../idempotency/idempotency";
import { infraLogger } from "../../logger/logger";

export interface ConsumeOptions {
  exchange?: string;
  routingKey?: string;
  noAck?: boolean;
  prefetch?: number;
  enableIdempotency?: boolean;
}

export type MessageHandler = (
  message: unknown,
  rawMessage: ConsumeMessage
) => Promise<void> | void;

interface MessageWithMetadata {
  _metadata?: {
    messageId: string;
    timestamp: number;
  };
  [key: string]: unknown;
}

export class RabbitMQConsumer {
  private channel: Channel | null = null;
  private readonly idempotency = new Idempotency();

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

    const {
      exchange,
      routingKey,
      noAck = false,
      prefetch = 1,
      enableIdempotency = true,
    } = options;

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
          const parsedMessage = JSON.parse(
            rawMessage.content.toString()
          ) as MessageWithMetadata;

          if (enableIdempotency && parsedMessage._metadata?.messageId) {
            const messageId = parsedMessage._metadata.messageId;

            const isNewMessage = await this.idempotency.checkAndMark(messageId);

            if (!isNewMessage) {
              infraLogger.rabbitmq.warn(
                {
                  messageId,
                  queue,
                  routingKey: rawMessage.fields.routingKey,
                },
                "Mensagem duplicada ignorada"
              );
              if (!noAck) {
                this.channel?.ack(rawMessage);
              }
              return;
            }
          }

          const { _metadata, ...message } = parsedMessage;
          const cleanMessage =
            Object.keys(message).length > 0 ? message : parsedMessage;

          await handler(cleanMessage, rawMessage);

          if (!noAck) {
            this.channel?.ack(rawMessage);
          }
        } catch (error) {
          infraLogger.rabbitmq.error(
            {
              queue,
              routingKey: rawMessage.fields.routingKey,
              error: error instanceof Error ? error.message : String(error),
            },
            "Erro ao processar mensagem"
          );

          if (!noAck) {
            this.channel?.nack(rawMessage, false, false);
          }
        }
      },
      { noAck }
    );

    infraLogger.rabbitmq.info(
      {
        queue,
        exchange,
        routingKey,
        enableIdempotency,
      },
      "Consumer iniciado"
    );
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
