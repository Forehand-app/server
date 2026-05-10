import { pgEnum } from "drizzle-orm/pg-core";

export const genderEnum = pgEnum("gender_enum", ["male", "female"]);

export const playingHandEnum = pgEnum("playing_hand_enum", ["left", "right"]);

export const volunteerRoleEnum = pgEnum("volunteer_role_enum", [
  "admin",
  "scorer",
]);

export const teamStatusEnum = pgEnum("team_status_enum", [
  "created",
  "registered",
  "participating",
  "rejected",
  "disqualified",
]);

export const matchStateEnum = pgEnum("match_state_enum", [
  "scheduled",
  "in_progress",
  "completed",
  "abandoned",
  "walkover",
]);

export const setStateEnum = pgEnum("set_state_enum", [
  "not_started",
  "in_progress",
  "completed",
]);

export const eventStateEnum = pgEnum("event_state_enum", [
  "created",
  "registration_closed",
  "participants_finalized",
  "scheduled",
  "in_progress",
  "round_over",
  "completed",
  "cancelled",
]);

export const tournamentStateEnum = pgEnum("tournament_state_enum", [
  "drafted",
  "published",
  "in_progress",
  "completed",
  "cancelled",
]);

export const sideSwitchEnum = pgEnum("side_switch_enum", [
  "per_set",
  "half_set",
  "no_switch",
]);

export const inviteStateEnum = pgEnum("invite_state_enum", [
  "pending",
  "accepted",
  "rejected",
]);

export const teamActionsEnum = pgEnum("team_actions_enum", [
  "rejected",
  "disqualified",
  "reverted",
]);
