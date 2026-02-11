import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "./schema";

const client = new SQL(Bun.env.DATABASE_URL!, { prepare: false });

export const db = drizzle({ client, schema });

export type Database = typeof db;
