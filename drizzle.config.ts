import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/services/db/schema.ts",
  out: "./migrations",

  dbCredentials: {
    url: Bun.env.DATABASE_URL!,
  },
});
