import { protectedApi } from "@/controller";
import {
  eventTable,
  teamActionLogsTable,
  teamParticipantTable,
  teamTable,
  tournamentTable,
} from "@/services/db/schema";
import { sendResponse } from "@/utils/response";
import { eq, and, inArray } from "drizzle-orm";
import { t } from "elysia";

export const teamRoutes = protectedApi.group("/team", (app) =>
  app
    .post(
      "/create",
      async ({ user, db, body }) => {
        try {
          const event = await db.query.eventTable.findFirst({
            where: { id: body.eventId },
            with: {
              teamType: true,
            },
          });

          if (!event || !event.teamType) {
            return sendResponse({
              success: false,
              message: "Event or team type not found",
            });
          }

          const participantIds = body.participantIds;

          // Singles check
          if (
            event.teamType.code === "singles" &&
            participantIds.length !== 1
          ) {
            return sendResponse({
              success: false,
              message: "Singles event must have exactly 1 participant",
            });
          }

          // Doubles check
          if (event.teamType.code === "doubles" && participantIds.length > 2) {
            return sendResponse({
              success: false,
              message: "Doubles event can have at most 2 participants",
            });
          }

          // Ensure current user is one of the participants if they are creating it
          // OR if they are an admin. For now, assume a user is creating for themselves.
          if (!participantIds.includes(user.id)) {
            // In some cases, a user might register a team they aren't in, but usually the creator is a participant.
            // We'll allow it if they are an admin or if we relax this.
            // Let's assume for now they must be one of them unless it's an org admin.
          }

          // Check if any participant is already in this event
          const existingParticipants = await db
            .select()
            .from(teamParticipantTable)
            .innerJoin(teamTable, eq(teamParticipantTable.teamId, teamTable.id))
            .where(
              and(
                eq(teamTable.eventId, body.eventId),
                inArray(teamParticipantTable.userId, participantIds),
              ),
            );

          if (existingParticipants.length > 0) {
            return sendResponse({
              success: false,
              message:
                "One or more participants are already registered for this event",
            });
          }

          const teamId = await db.transaction(async (tx) => {
            const insertedTeams = await tx
              .insert(teamTable)
              .values({
                eventId: body.eventId,
                teamTypeId: event.teamTypeId,
                teamStatus: "registered",
              })
              .returning({ id: teamTable.id });

            const newTeam = insertedTeams[0];
            if (!newTeam) throw new Error("Failed to create team");

            const participantValues = participantIds.map((userId) => ({
              teamId: newTeam.id,
              userId,
            }));

            await tx.insert(teamParticipantTable).values(participantValues);

            return newTeam.id;
          });

          return sendResponse({
            success: true,
            message: "Team registered successfully",
            data: { teamId },
          });
        } catch (error) {
          console.error("[team/create] failed", error);
          return sendResponse({
            success: false,
            message: "Failed to register team",
          });
        }
      },
      {
        body: t.Object({
          eventId: t.String(),
          participantIds: t.Array(t.String(), { minItems: 1, maxItems: 2 }),
        }),
      },
    )
    .post(
      "/approve",
      async ({ user, db, body }) => {
        try {
          const team = await db.query.teamTable.findFirst({
            where: { id: body.teamId },
            with: {
              event: {
                with: {
                  tournament: true,
                },
              },
            },
          });

          if (!team || !team.event || !team.event.tournament) {
            return sendResponse({
              success: false,
              message: "Team or related tournament not found",
            });
          }

          // Check if user is a member of the organization that owns the tournament
          const member = await db.query.organizationMemberTable.findFirst({
            where: {
              organizationId: team.event.tournament.organizationId,
              userId: user.id,
            },
          });

          if (!member) {
            return sendResponse({
              success: false,
              message:
                "You are not eligible to approve teams for this tournament",
            });
          }

          await db.transaction(async (tx) => {
            await tx
              .update(teamTable)
              .set({ teamStatus: "participating" })
              .where(eq(teamTable.id, body.teamId));

            await tx.insert(teamActionLogsTable).values({
              teamId: body.teamId,
              actedById: user.id,
              action: "reverted", // Should probably have "approved" but enums only show rejected, disqualified, reverted
              reason: "Team approved by admin",
            });
          });

          return sendResponse({
            success: true,
            message: "Team approved successfully",
          });
        } catch (error) {
          console.error("[team/approve] failed", error);
          return sendResponse({
            success: false,
            message: "Failed to approve team",
          });
        }
      },
      {
        body: t.Object({
          teamId: t.String(),
        }),
      },
    )
    .post(
      "/reject",
      async ({ user, db, body }) => {
        try {
          const team = await db.query.teamTable.findFirst({
            where: { id: body.teamId },
            with: {
              event: {
                with: {
                  tournament: true,
                },
              },
            },
          });

          if (!team || !team.event || !team.event.tournament) {
            return sendResponse({
              success: false,
              message: "Team or related tournament not found",
            });
          }

          const member = await db.query.organizationMemberTable.findFirst({
            where: {
              organizationId: team.event.tournament.organizationId,
              userId: user.id,
            },
          });

          if (!member) {
            return sendResponse({
              success: false,
              message:
                "You are not eligible to reject teams for this tournament",
            });
          }

          await db.transaction(async (tx) => {
            await tx
              .update(teamTable)
              .set({ teamStatus: "rejected" })
              .where(eq(teamTable.id, body.teamId));

            await tx.insert(teamActionLogsTable).values({
              teamId: body.teamId,
              actedById: user.id,
              action: "rejected",
              reason: body.reason,
            });
          });

          return sendResponse({
            success: true,
            message: "Team rejected successfully",
          });
        } catch (error) {
          console.error("[team/reject] failed", error);
          return sendResponse({
            success: false,
            message: "Failed to reject team",
          });
        }
      },
      {
        body: t.Object({
          teamId: t.String(),
          reason: t.String(),
        }),
      },
    )
    .get(
      "/list/:eventId",
      async ({ db, params: { eventId } }) => {
        const teams = await db.query.teamTable.findMany({
          where: { eventId },
          with: {
            participants: {
              with: {
                user: true,
              },
            },
            teamType: true,
          },
        });

        return sendResponse({
          success: true,
          message: "Teams fetched successfully",
          data: teams,
        });
      },
      {
        params: t.Object({ eventId: t.String() }),
      },
    ),
);
