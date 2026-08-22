import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Миграции идут по прямому адресу: пулер Neon работает в transaction-режиме
    // и не поддерживает операции, которые выполняет prisma migrate.
    // Приложение в рантайме использует DATABASE_URL (пулер) — см. src/lib/db/client.ts.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
