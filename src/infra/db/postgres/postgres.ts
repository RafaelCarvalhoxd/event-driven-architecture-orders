import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../../env/env";
import * as schemas from "./schemas/index";

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
    console.log(
      `✅ Conectado ao PostgreSQL: ${env.db.postgres.host}:${env.db.postgres.port}/${env.db.postgres.database}`
    );
    client.release();
  } catch (error) {
    console.error("❌ Erro ao conectar ao PostgreSQL:", error);
    throw error;
  }
}
