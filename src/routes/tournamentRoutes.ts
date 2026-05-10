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
  tournamentInvitesTable,
  tournamentTable,
  tournamentVolunteerTable,
} from "@/services/db/schema";
import { inArray, eq, notInArray, or, and } from "drizzle-orm";
import { getDate } from "@/utils/helpers";
import { sendResponse } from "@/utils/response";
import { t } from "elysia";

export const tournamentRoutes = protectedApi.group("/tournament", (app) =>
  app
    .get(
      "/info/:tournamentId",
      async ({ db, params: { tournamentId } }) => {
        const tournament = await db.query.tournamentTable.findFirst({
          with: {
            events: {
              with: {
                paymentMode: true,
                sportsOption: true,
                eventFormat: true,
                teamType: true,
                teams: true,
              },
            },
            organization: true,
          },
          where: { id: tournamentId },
        });

        return sendResponse({
          success: true,
          message: "Tournament retrieved successfully",
          data: tournament,
        });
      },
      {
        params: t.Object({ tournamentId: t.String() }),
      },
    )
    .post(
      "/publish/:tournamentId",
      async ({ db, user, params: { tournamentId } }) => {
        const tournament = await db.query.tournamentTable.findFirst({
          where: { id: tournamentId },
        });

        if (!tournament) {
          return sendResponse({
            success: false,
            message: "Tournament not found",
          });
        }

        const member = await db.query.organizationMemberTable.findFirst({
          where: {
            organizationId: tournament.organizationId,
            userId: user.id,
          },
        });

        if (!member) {
          return sendResponse({
            success: false,
            message: "You are not eligible to publish this tournament",
          });
        }

        if (tournament.tournamentState !== "drafted") {
          return sendResponse({
            success: false,
            message: `Tournament cannot be published from its current state: ${tournament.tournamentState}`,
          });
        }

        await db
          .update(tournamentTable)
          .set({ tournamentState: "published" })
          .where(eq(tournamentTable.id, tournamentId));

        return sendResponse({
          success: true,
          message: "Tournament published successfully",
        });
      },
      {
        params: t.Object({ tournamentId: t.String() }),
      },
    )
    .delete(
      "delete/:tournamentId",
      async ({ db, user, params: { tournamentId } }) => {
        // Check if user is eligible (member of the organization that owns the tournament)
        const tournament = await db.query.tournamentTable.findFirst({
          where: { id: tournamentId },
          columns: { organizationId: true },
        });

        if (!tournament) {
          return sendResponse({
            success: false,
            message: "Tournament not found",
          });
        }

        const member = await db.query.organizationMemberTable.findFirst({
          where: {
            organizationId: tournament.organizationId,
            userId: user.id,
          },
        });

        if (!member) {
          return sendResponse({
            success: false,
            message: "You are not eligible to delete this tournament",
          });
        }

        await db.transaction(async (tx) => {
          const events = await tx
            .select({ id: eventTable.id })
            .from(eventTable)
            .where(eq(eventTable.tournamentId, tournamentId));

          const eventIds = events.map((e) => e.id);

          if (eventIds.length > 0) {
            // Delete event invites
            const eventInvites = await tx
              .select({ inviteId: eventInvitesTable.inviteId })
              .from(eventInvitesTable)
              .where(inArray(eventInvitesTable.eventId, eventIds));

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
              .where(inArray(matchTable.eventId, eventIds));

            const matchIds = matches.map((m) => m.id);

            if (matchIds.length > 0) {
              await tx
                .delete(setTable)
                .where(inArray(setTable.matchId, matchIds));
              await tx
                .delete(matchTable)
                .where(inArray(matchTable.id, matchIds));
            }

            const teams = await tx
              .select({ id: teamTable.id })
              .from(teamTable)
              .where(inArray(teamTable.eventId, eventIds));

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

            await tx.delete(eventTable).where(inArray(eventTable.id, eventIds));
          }

          // Delete tournament invites
          const tournamentInvites = await tx
            .select({ inviteId: tournamentInvitesTable.inviteId })
            .from(tournamentInvitesTable)
            .where(eq(tournamentInvitesTable.tournamentId, tournamentId));

          const tournamentInviteIds = tournamentInvites.map(
            (ti) => ti.inviteId,
          );

          if (tournamentInviteIds.length > 0) {
            await tx
              .delete(tournamentInvitesTable)
              .where(
                inArray(tournamentInvitesTable.inviteId, tournamentInviteIds),
              );
            await tx
              .delete(invitesTable)
              .where(inArray(invitesTable.id, tournamentInviteIds));
          }

          await tx
            .delete(tournamentVolunteerTable)
            .where(eq(tournamentVolunteerTable.tournamentId, tournamentId));
          await tx
            .delete(tournamentTable)
            .where(eq(tournamentTable.id, tournamentId));
        });

        return sendResponse({
          success: true,
          message: "Tournament and all related data deleted successfully",
        });
      },
      {
        params: t.Object({ tournamentId: t.String() }),
      },
    )
    .post(
      "/create",
      async ({ user, db, body }) => {
        const member = await db.query.organizationMemberTable.findFirst({
          where: { organizationId: body.organizationId, userId: user.id },
        });

        if (!member)
          return sendResponse({
            success: false,
            message: "You are not eligible to create this tournament",
          });

        const tournamentInsert = await db
          .insert(tournamentTable)
          .values({
            organizationId: body.organizationId,
            name: body.name,
            description: body.description,
            startDate: getDate(body.startDate),
            endDate: body.endDate !== undefined ? getDate(body.endDate) : null,

            venueName: body.venueName,
            venueAddress: body.venueAddress,
            venueCity: body.venueCity,
            venueState: body.venueState,
            venuePostalCode: body.venuePostalCode,
            venueCourts: body.venueCourts,

            contactName: body.contactName,
            contactEmail: body.contactEmail,
            contactPhone: body.contactPhone,
            upiId: body.upiId,
          })
          .returning({ id: tournamentTable.id });

        const tournamentId = tournamentInsert[0]!.id;

        return sendResponse({
          success: true,
          message: "Tournament created successfully",
          data: tournamentId,
        });
      },
      {
        body: t.Object({
          organizationId: t.String(),
          name: t.String(),
          description: t.String(),
          startDate: t.String(),
          endDate: t.Optional(t.String()),

          venueName: t.String(),
          venueAddress: t.String(),
          venueCity: t.String(),
          venueState: t.String(),
          venuePostalCode: t.String(),
          venueCourts: t.Number(),

          contactName: t.String(),
          contactEmail: t.String(),
          contactPhone: t.String({ pattern: "^[6-9]\\d{9}$" }),
          upiId: t.Nullable(t.String()),
        }),
      },
    )
    .group("/events", (eventsApp) =>
      eventsApp
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
                return {
                  success: false,
                  message: "You are not eligible to create these event",
                };
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
                await tx
                  .delete(matchTable)
                  .where(inArray(matchTable.id, matchIds));
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
                await tx
                  .delete(teamTable)
                  .where(inArray(teamTable.id, teamIds));
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
        ),
    )
    .group("/list", (listApp) =>
      listApp
        .get(
          "/org/:orgId",
          async ({ user, db, params: { orgId } }) => {
            const member = await db.query.organizationMemberTable.findFirst({
              where: {
                userId: user.id,
                organizationId: orgId,
              },
            });

            if (!member) {
              return sendResponse({
                success: false,
                message: "You are not a member of this organization",
              });
            }

            const tournaments = await db.query.tournamentTable.findMany({
              where: {
                organizationId: orgId,
              },
              with: {
                events: {
                  with: {
                    sportsOption: true,
                  },
                },
              },
            });

            return sendResponse({
              success: true,
              message: "Tournaments retrieved successfully",
              data: tournaments,
            });
          },
          {
            params: t.Object({
              orgId: t.String(),
            }),
          },
        )
        .group("/user", (userApp) =>
          userApp
            .get("/browse", async ({ db, user }) => {
              const joinedTournamentsQuery = await db
                .select({ id: eventTable.tournamentId })
                .from(teamParticipantTable)
                .innerJoin(
                  teamTable,
                  eq(teamParticipantTable.teamId, teamTable.id),
                )
                .innerJoin(eventTable, eq(teamTable.eventId, eventTable.id))
                .where(eq(teamParticipantTable.userId, user.id));

              const joinedTournamentIds = new Set(
                joinedTournamentsQuery.map((r) => r.id),
              );

              const tournaments = await db.query.tournamentTable.findMany({
                where: { tournamentState: "published" },
                with: {
                  events: {
                    with: {
                      sportsOption: true,
                    },
                  },
                  organization: {
                    with: {
                      orgType: true,
                    },
                  },
                },
              });

              console.log(
                "Tournaments: ",
                tournaments.map((t) => t.id),
              );
              console.log("Joined tournament IDs: ", joinedTournamentIds);

              const filtered = tournaments.filter(
                (t) => !joinedTournamentIds.has(t.id),
              );

              return sendResponse({
                success: true,
                message: "Tournaments for browsing retrieved successfully",
                data: filtered,
              });
            })
            .get("/joined", async ({ db, user }) => {
              const joinedTournamentsQuery = await db
                .select({ id: eventTable.tournamentId })
                .from(teamParticipantTable)
                .innerJoin(
                  teamTable,
                  eq(teamParticipantTable.teamId, teamTable.id),
                )
                .innerJoin(eventTable, eq(teamTable.eventId, eventTable.id))
                .where(eq(teamParticipantTable.userId, user.id));

              const joinedTournamentIds = new Set(
                joinedTournamentsQuery.map((r) => r.id),
              );

              if (joinedTournamentIds.size === 0) {
                return sendResponse({
                  success: true,
                  message: "No joined tournaments found",
                  data: [],
                });
              }

              const tournaments = await db.query.tournamentTable.findMany({
                with: {
                  events: {
                    with: {
                      sportsOption: true,
                    },
                  },
                  organization: {
                    with: {
                      orgType: true,
                    },
                  },
                },
              });

              const filtered = tournaments.filter(
                (t) =>
                  joinedTournamentIds.has(t.id) &&
                  (t.tournamentState === "published" ||
                    t.tournamentState === "in_progress"),
              );

              return sendResponse({
                success: true,
                message: "Joined tournaments retrieved successfully",
                data: filtered,
              });
            })
            .get("/history", async ({ db, user }) => {
              const joinedTournamentsQuery = await db
                .select({ id: eventTable.tournamentId })
                .from(teamParticipantTable)
                .innerJoin(
                  teamTable,
                  eq(teamParticipantTable.teamId, teamTable.id),
                )
                .innerJoin(eventTable, eq(teamTable.eventId, eventTable.id))
                .where(eq(teamParticipantTable.userId, user.id));

              const joinedTournamentIds = new Set(
                joinedTournamentsQuery.map((r) => r.id),
              );

              if (joinedTournamentIds.size === 0) {
                return sendResponse({
                  success: true,
                  message: "No historical tournaments found",
                  data: [],
                });
              }

              const tournaments = await db.query.tournamentTable.findMany({
                where: { tournamentState: "completed" },
                with: {
                  events: {
                    with: {
                      sportsOption: true,
                    },
                  },
                  organization: {
                    with: {
                      orgType: true,
                    },
                  },
                },
              });

              const filtered = tournaments.filter((t) =>
                joinedTournamentIds.has(t.id),
              );

              return sendResponse({
                success: true,
                message: "Tournament history retrieved successfully",
                data: filtered,
              });
            }),
        ),
    ),
);
