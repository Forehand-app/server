import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "@/services/db/schema";
import { relations } from "@/services/db/relations";

const client = new SQL(Bun.env.DATABASE_URL!, { prepare: false });

export const db = drizzle({
  client,
  schema,
  relations,
});

export type Database = typeof db;
