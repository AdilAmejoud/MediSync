import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "prisma/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

export default defineConfig({
  schema: "../database/schema.prisma",
  migrations: {
    path: "../database/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
