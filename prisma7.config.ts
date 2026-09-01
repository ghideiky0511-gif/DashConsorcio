// Configuração do Prisma CLI (Prisma 7).
// As URLs do banco vivem aqui (não no schema.prisma).
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Conexão DIRETA (Supabase porta 5432) para migrate / introspect / studio.
    // O runtime da app usa a conexão POOLED (DATABASE_URL) via driver adapter em src/lib/db.ts.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
    // Opcional: um banco separado para o shadow das migrations (Supabase costuma exigir).
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
