import Redis from "ioredis";
import { env } from "../../env/env";
import { infraLogger } from "../../logger/logger";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: env.db.redis.host,
      port: Number(env.db.redis.port),
      password: env.db.redis.password,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    redisClient.on("connect", () => {
      infraLogger.redis.info("Conectado ao Redis");
    });

    redisClient.on("error", (error) => {
      infraLogger.redis.error(
        { error: error instanceof Error ? error.message : String(error) },
        "Erro no Redis"
      );
    });
  }

  return redisClient;
}

export async function connectRedis(): Promise<void> {
  try {
    const client = getRedisClient();
    await client.ping();
    infraLogger.redis.info(
      {
        host: env.db.redis.host,
        port: env.db.redis.port,
      },
      "Redis conectado com sucesso"
    );
  } catch (error) {
    infraLogger.redis.error(
      {
        host: env.db.redis.host,
        port: env.db.redis.port,
        error: error instanceof Error ? error.message : String(error),
      },
      "Erro ao conectar ao Redis"
    );
    throw error;
  }
}
