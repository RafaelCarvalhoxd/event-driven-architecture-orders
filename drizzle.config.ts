import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  schema: "./src/infra/db/postgres/schemas/*.ts",
  dialect: "postgresql",
  dbCredentials: {
    host: process.env.DB_POSTGRES_HOST || "localhost",
    port: Number(process.env.DB_POSTGRES_PORT) || 5432,
    user: process.env.DB_POSTGRES_USERNAME || "postgres",
    password: process.env.DB_POSTGRES_PASSWORD || "postgres",
    database: process.env.DB_POSTGRES_DATABASE || "postgres",
  },
});
