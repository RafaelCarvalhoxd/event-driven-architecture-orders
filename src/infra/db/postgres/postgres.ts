import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../../env/env";
import * as schemas from "./schemas/index";
import { infraLogger } from "../../logger/logger";

const pool = new Pool({
  host: env.db.postgres.host,
  port: Number(env.db.postgres.port),
  user: env.db.postgres.username,
  password: env.db.postgres.password,
  database: env.db.postgres.database,
});

export const db = drizzle(pool, { schema: schemas });

export type Database = typeof db;

export async function connectDatabase(): Promise<void> {
  try {
    const client = await pool.connect();
    infraLogger.database.info(
      {
        host: env.db.postgres.host,
        port: env.db.postgres.port,
        database: env.db.postgres.database,
      },
      "PostgreSQL conectado com sucesso"
    );
    client.release();
  } catch (error) {
    infraLogger.database.error(
      {
        host: env.db.postgres.host,
        port: env.db.postgres.port,
        database: env.db.postgres.database,
        error: error instanceof Error ? error.message : String(error),
      },
      "Erro ao conectar ao PostgreSQL"
    );
    throw error;
  }
}
