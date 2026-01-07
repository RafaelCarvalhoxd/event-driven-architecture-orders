import { getRedisClient } from "../../db/redis/redis";
import { randomUUID } from "crypto";
import { infraLogger } from "../../logger/logger";

export interface MessageMetadata {
  messageId: string;
  eventType?: string;
  timestamp: number;
}

export class Idempotency {
  private readonly redis = getRedisClient();
  private readonly keyPrefix = "processed:";
  private readonly defaultTtl = 30 * 24 * 60 * 60;

  generateMessageId(): string {
    return randomUUID();
  }

  async isProcessed(messageId: string): Promise<boolean> {
    try {
      const key = `${this.keyPrefix}${messageId}`;
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      infraLogger.idempotency.error(
        {
          messageId,
          error: error instanceof Error ? error.message : String(error),
        },
        "Erro ao verificar idempotência"
      );
      return false;
    }
  }

  async markAsProcessed(
    messageId: string,
    ttl: number = this.defaultTtl
  ): Promise<void> {
    try {
      const key = `${this.keyPrefix}${messageId}`;
      await this.redis.setex(key, ttl, "1");
    } catch (error) {
      infraLogger.idempotency.error(
        {
          messageId,
          ttl,
          error: error instanceof Error ? error.message : String(error),
        },
        "Erro ao marcar mensagem como processada"
      );
    }
  }

  async checkAndMark(
    messageId: string,
    ttl: number = this.defaultTtl
  ): Promise<boolean> {
    try {
      const key = `${this.keyPrefix}${messageId}`;
      const result = await this.redis.set(key, "1", "EX", ttl, "NX");
      return result === "OK";
    } catch (error) {
      infraLogger.idempotency.error(
        {
          messageId,
          ttl,
          error: error instanceof Error ? error.message : String(error),
        },
        "Erro ao verificar/marcar idempotência"
      );
      return true;
    }
  }

  async remove(messageId: string): Promise<void> {
    try {
      const key = `${this.keyPrefix}${messageId}`;
      await this.redis.del(key);
    } catch (error) {
      infraLogger.idempotency.error(
        {
          messageId,
          error: error instanceof Error ? error.message : String(error),
        },
        "Erro ao remover mensagem do cache"
      );
    }
  }
}
