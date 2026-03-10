import * as schema from "@/services/db/schema";
import { defineRelations } from "drizzle-orm";

export const relations = defineRelations(schema, (relation) => ({}));
