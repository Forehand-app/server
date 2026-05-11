import { protectedApi } from "@/controller";
import {
  eventInvitesTable,
  eventTable,
  invitesTable,
  matchTable,
  setTable,
  teamActionLogsTable,
  teamParticipantTable,
  teamTable,
} from "@/services/db/schema";
import { inArray, eq, and, notInArray } from "drizzle-orm";
import { getDate } from "@/utils/helpers";
import { sendResponse } from "@/utils/response";
import { t } from "elysia";

export const eventRoutes = protectedApi.group("/event", (app) =>
  app
    .post(
      "/create",
      async ({ user, db, body }) => {
        for (const event of body) {
          const member = await db.query.tournamentTable.findFirst({
            where: {
              id: event.tournamentId,
              organization: {
                members: {
                  userId: user.id,
                },
              },
            },
          });

          if (!member) {
            return sendResponse({
              success: false,
              message: "You are not eligible to create these event",
            });
          }

          const sport = await db.query.sportsOptionsTable.findFirst({
            where: {
              code: event.sportsOptionCode,
            },
            columns: {
              id: true,
            },
          });

          const eventFormat = await db.query.eventFormatsTable.findFirst({
            where: {
              code: event.eventFormatCode,
            },
            columns: {
              id: true,
            },
          });

          const teamType = await db.query.teamTypesTable.findFirst({
            where: {
              code: event.teamTypeCode,
            },
            columns: {
              id: true,
            },
          });

          const paymentMode =
            event.paymentModeCode !== null
              ? await db.query.paymentModesTable.findFirst({
                  where: {
                    code: event.paymentModeCode,
                  },
                  columns: {
                    id: true,
                  },
                })
              : null;

          if (
            !sport ||
            !eventFormat ||
            !teamType ||
            (event.paymentModeCode && !paymentMode)
          ) {
            return sendResponse({
              success: false,
              message: "Invalid event details",
            });
          }

          await db.insert(eventTable).values({
            tournamentId: event.tournamentId,
            name: event.name,
            sportId: sport.id,
            formatId: eventFormat.id,
            gender: event.gender,

            dueDate: getDate(event.dueDate),
            startDate: getDate(event.startDate),

            teamTypeId: teamType.id,

            pointsPerSet: event.pointsPerSet,
            setsPerMatch: event.setsPerMatch,

            paymentModeId: paymentMode?.id,
            amount: event.amount,
            playerBornAfter:
              event.playerBornAfter !== null
                ? getDate(event.playerBornAfter!)
                : null,
          });
        }
        return sendResponse({
          success: true,
          message: "Event created successfully",
        });
      },
      {
        body: t.Array(
          t.Object({
            tournamentId: t.String(),
            name: t.String(),
            sportsOptionCode: t.String(),
            eventFormatCode: t.String(),
            dueDate: t.String(),
            startDate: t.String(),
            gender: t.Nullable(t.UnionEnum(["male", "female"])),
            teamTypeCode: t.String(),
            setsPerMatch: t.Number(),
            pointsPerSet: t.Number(),
            playerBornAfter: t.Nullable(t.String()),
            paymentModeCode: t.Nullable(t.String()),
            amount: t.Number(),
          }),
        ),
      },
    )
    .delete(
      "/:eventId",
      async ({ db, user, params: { eventId } }) => {
        const event = await db.query.eventTable.findFirst({
          where: { id: eventId },
          with: {
            tournament: {
              columns: { organizationId: true },
            },
          },
        });

        if (!event || !event.tournament) {
          return sendResponse({
            success: false,
            message: "Event or related tournament not found",
          });
        }

        const member = await db.query.organizationMemberTable.findFirst({
          where: {
            organizationId: event.tournament.organizationId,
            userId: user.id,
          },
        });
        if (!member) {
          return sendResponse({
            success: false,
            message: "You are not eligible to delete this event",
          });
        }

        await db.transaction(async (tx) => {
          // Delete event invites
          const eventInvites = await tx
            .select({ inviteId: eventInvitesTable.inviteId })
            .from(eventInvitesTable)
            .where(eq(eventInvitesTable.eventId, eventId));

          const eventInviteIds = eventInvites.map((ei) => ei.inviteId);

          if (eventInviteIds.length > 0) {
            await tx
              .delete(eventInvitesTable)
              .where(inArray(eventInvitesTable.inviteId, eventInviteIds));
            await tx
              .delete(invitesTable)
              .where(inArray(invitesTable.id, eventInviteIds));
          }

          const matches = await tx
            .select({ id: matchTable.id })
            .from(matchTable)
            .where(eq(matchTable.eventId, eventId));

          const matchIds = matches.map((m) => m.id);

          if (matchIds.length > 0) {
            await tx
              .delete(setTable)
              .where(inArray(setTable.matchId, matchIds));
            await tx.delete(matchTable).where(inArray(matchTable.id, matchIds));
          }

          const teams = await tx
            .select({ id: teamTable.id })
            .from(teamTable)
            .where(eq(teamTable.eventId, eventId));

          const teamIds = teams.map((t) => t.id);

          if (teamIds.length > 0) {
            await tx
              .delete(teamParticipantTable)
              .where(inArray(teamParticipantTable.teamId, teamIds));
            await tx
              .delete(teamActionLogsTable)
              .where(inArray(teamActionLogsTable.teamId, teamIds));
            await tx.delete(teamTable).where(inArray(teamTable.id, teamIds));
          }

          await tx.delete(eventTable).where(eq(eventTable.id, eventId));
        });
        return sendResponse({
          success: true,
          message: "Event and all related data deleted successfully",
        });
      },
      {
        params: t.Object({ eventId: t.String() }),
      },
    )
    .post(
      "/update-state/:eventId",
      async ({ db, user, body, params: { eventId } }) => {
        const event = await db.query.eventTable.findFirst({
          where: { id: eventId },
          with: {
            tournament: true,
          },
        });

        if (!event || !event.tournament) {
          return sendResponse({
            success: false,
            message: "Event or related tournament not found",
          });
        }

        const member = await db.query.organizationMemberTable.findFirst({
          where: {
            organizationId: event.tournament.organizationId,
            userId: user.id,
          },
        });

        if (!member) {
          return sendResponse({
            success: false,
            message: "You are not eligible to update this event state",
          });
        }

        await db
          .update(eventTable)
          .set({ eventState: body.state })
          .where(eq(eventTable.id, eventId));

        return sendResponse({
          success: true,
          message: `Event state updated to ${body.state} successfully`,
        });
      },
      {
        params: t.Object({ eventId: t.String() }),
        body: t.Object({
          state: t.Union([
            t.Literal("created"),
            t.Literal("registration_closed"),
            t.Literal("participants_finalized"),
            t.Literal("scheduled"),
            t.Literal("in_progress"),
            t.Literal("round_over"),
            t.Literal("completed"),
            t.Literal("cancelled"),
          ]),
        }),
      },
    )
    .get(
      "/participants/:eventId",
      async ({ db, params: { eventId } }) => {
        const participants = await db.query.teamTable.findMany({
          where: { eventId: eventId },
          with: {
            participants: {
              with: {
                user: true,
              },
            },
          },
        });

        return sendResponse({
          success: true,
          message: "Event participants fetched successfully",
          data: participants,
        });
      },
      {
        params: t.Object({ eventId: t.String() }),
      },
    )
    .post(
      "/finalize-participants/:eventId",
      async ({ db, user, params: { eventId } }) => {
        try {
          const event = await db.query.eventTable.findFirst({
            where: { id: eventId },
            with: {
              tournament: true,
            },
          });

          if (!event || !event.tournament) {
            return sendResponse({
              success: false,
              message: "Event or related tournament not found",
            });
          }

          const member = await db.query.organizationMemberTable.findFirst({
            where: {
              organizationId: event.tournament.organizationId,
              userId: user.id,
            },
          });

          if (!member) {
            return sendResponse({
              success: false,
              message: "You are not eligible to finalize participants",
            });
          }

          await db.transaction(async (tx) => {
            // Update event state and active round
            await tx
              .update(eventTable)
              .set({
                eventState: "participants_finalized",
                activeRound: 1,
              })
              .where(eq(eventTable.id, eventId));

            // Update all teams that are not rejected or disqualified to participating
            await tx
              .update(teamTable)
              .set({ teamStatus: "participating" })
              .where(
                and(
                  eq(teamTable.eventId, eventId),
                  notInArray(teamTable.teamStatus, [
                    "rejected",
                    "disqualified",
                  ]),
                ),
              );
          });

          return sendResponse({
            success: true,
            message: "Participants finalized successfully",
          });
        } catch (error) {
          console.error("[event/finalize-participants] failed", error);
          return sendResponse({
            success: false,
            message: "Failed to finalize participants",
          });
        }
      },
      {
        params: t.Object({ eventId: t.String() }),
      },
    )
    .post(
      "/finalize-schedule/:eventId",
      async ({ db, user, body, params: { eventId } }) => {
        try {
          const event = await db.query.eventTable.findFirst({
            where: { id: eventId },
            with: {
              tournament: true,
            },
          });

          if (!event || !event.tournament) {
            return sendResponse({
              success: false,
              message: "Event or related tournament not found",
            });
          }

          const member = await db.query.organizationMemberTable.findFirst({
            where: {
              organizationId: event.tournament.organizationId,
              userId: user.id,
            },
          });

          if (!member) {
            return sendResponse({
              success: false,
              message: "You are not eligible to finalize the schedule",
            });
          }

          await db.transaction(async (tx) => {
            // Update event state
            await tx
              .update(eventTable)
              .set({ eventState: "scheduled" })
              .where(eq(eventTable.id, eventId));

            // Create matches
            for (const match of body.matches) {
              await tx.insert(matchTable).values({
                eventId: eventId,
                roundNumber: match.roundNumber,
                teamA: match.teamA,
                teamB: match.teamB,
                scorer: match.scorer || user.id,
                matchState: "scheduled",
                setsPerMatchId: match.setsPerMatch || event.setsPerMatch,
                pointsPerSet: match.pointsPerSet || event.pointsPerSet,
                sideSwitching: match.sideSwitching || "per_set",
              });
            }
          });

          return sendResponse({
            success: true,
            message: "Schedule finalized and matches created successfully",
          });
        } catch (error) {
          console.error("[event/finalize-schedule] failed", error);
          return sendResponse({
            success: false,
            message: "Failed to finalize schedule",
          });
        }
      },
      {
        params: t.Object({ eventId: t.String() }),
        body: t.Object({
          matches: t.Array(
            t.Object({
              roundNumber: t.Number(),
              teamA: t.String(),
              teamB: t.String(),
              scorer: t.Optional(t.String()),
              setsPerMatch: t.Optional(t.Number()),
              pointsPerSet: t.Optional(t.Number()),
              sideSwitching: t.Optional(
                t.Union([
                  t.Literal("per_set"),
                  t.Literal("half_set"),
                  t.Literal("no_switch"),
                ]),
              ),
            }),
          ),
        }),
      },
    )
    .post(
      "/complete/:eventId",
      async ({ db, user, body, params: { eventId } }) => {
        try {
          const event = await db.query.eventTable.findFirst({
            where: { id: eventId },
            with: {
              tournament: true,
            },
          });

          if (!event || !event.tournament) {
            return sendResponse({
              success: false,
              message: "Event or related tournament not found",
            });
          }

          const member = await db.query.organizationMemberTable.findFirst({
            where: {
              organizationId: event.tournament.organizationId,
              userId: user.id,
            },
          });

          if (!member) {
            return sendResponse({
              success: false,
              message: "You are not eligible to complete this event",
            });
          }

          await db
            .update(eventTable)
            .set({
              eventState: "completed",
              winnerId: body.winnerId,
            })
            .where(eq(eventTable.id, eventId));

          return sendResponse({
            success: true,
            message: "Event completed successfully",
          });
        } catch (error) {
          console.error("[event/complete] failed", error);
          return sendResponse({
            success: false,
            message: "Failed to complete event",
          });
        }
      },
      {
        params: t.Object({ eventId: t.String() }),
        body: t.Object({
          winnerId: t.String(),
          runnerUpId: t.String(),
        }),
      },
    ),
);
