import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";

export const orgTypesTable = pgTable.withRLS("org_types_table", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  label: text("label").notNull(),
});

export const sportsOptionsTable = pgTable.withRLS("sports_options_table", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  label: text("label").notNull(),
});

export const paymentModesTable = pgTable.withRLS("payment_modes_table", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  label: text("label").notNull(),
});

export const teamTypesTable = pgTable.withRLS("team_types_table", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  label: text("label").notNull(),
});

export const inviteTypeTable = pgTable.withRLS("invite_types_table", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  label: text("label").notNull(),
});

export const eventFormatsTable = pgTable.withRLS("event_formats_table", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  label: text("label").notNull(),
});

export const setsPerMatchOptionsTable = pgTable.withRLS(
  "sets_per_match_options_table",
  {
    id: serial("id").primaryKey(),
    code: integer("code").notNull().unique(),
  },
);

export const pointsPerSetOptionsTable = pgTable.withRLS(
  "points_per_set_options_table",
  {
    id: serial("id").primaryKey(),
    code: integer("code").notNull().unique(),
  },
);
