import {
  date,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { genderEnum, inviteStateEnum, playingHandEnum } from "./enums";
import { createdAt, updatedAt } from "./common";
import { inviteTypeTable } from "./lookups";
import { organizationTable } from "./organization";
import { teamTable, tournamentTable } from "./tournament";

export const profileTable = pgTable.withRLS("profile_table", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  dob: date("dob", { mode: "date" }).notNull(),
  gender: genderEnum().notNull(),
  phone: text("phone").notNull(),
  profilePicUrl: text("profile_pic_url"),

  playingHand: playingHandEnum("playing_hand"),
  primarySport: text("primary_sport"),

  createdAt,
  updatedAt,
});

export const invitesTable = pgTable.withRLS("invites_table", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => profileTable.id),
  receiverId: uuid("receiver_id")
    .notNull()
    .references(() => profileTable.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  inviteState: inviteStateEnum("invite_state").notNull().default("pending"),
  invteTypeId: integer("invite_type_id")
    .notNull()
    .references(() => inviteTypeTable.id),

  createdAt,
  updatedAt,
});

export const organizationInvitesTable = pgTable.withRLS(
  "organization_invites_table",
  {
    inviteId: uuid("invite_id")
      .notNull()
      .references(() => invitesTable.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizationTable.id),
  },
  (table) => [primaryKey({ columns: [table.inviteId, table.organizationId] })],
);

export const teamInvitesTable = pgTable.withRLS(
  "team_invites_table",
  {
    inviteId: uuid("invite_id")
      .notNull()
      .references(() => invitesTable.id),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teamTable.id),
  },
  (table) => [primaryKey({ columns: [table.inviteId, table.teamId] })],
);

export const tournamentInvitesTable = pgTable.withRLS(
  "tournament_invites_table",
  {
    inviteId: uuid("invite_id")
      .notNull()
      .references(() => invitesTable.id),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournamentTable.id),
  },
  (table) => [primaryKey({ columns: [table.inviteId, table.tournamentId] })],
);
