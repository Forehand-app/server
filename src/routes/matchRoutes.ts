import { protectedApi } from "@/controller";
import {
  matchTable,
  setTable,
  eventTable,
  teamTable,
} from "@/services/db/schema";
import { sendResponse } from "@/utils/response";
import { eq, and } from "drizzle-orm";
import { t } from "elysia";

export const matchRoutes = protectedApi.group("/match", (app) =>
  app
    .post(
      "/create",
      async ({ user, db, body }) => {
        try {
          const event = await db.query.eventTable.findFirst({
            where: { id: body.eventId },
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

          // Check if user is eligible to create matches (org member)
          const member = await db.query.organizationMemberTable.findFirst({
            where: {
              organizationId: event.tournament.organizationId,
              userId: user.id,
            },
          });

          if (!member) {
            return sendResponse({
              success: false,
              message: "You are not eligible to create matches for this event",
            });
          }

          const matchId = await db.transaction(async (tx) => {
            const insertedMatches = await tx
              .insert(matchTable)
              .values({
                eventId: body.eventId,
                roundNumber: body.roundNumber,
                teamA: body.teamA,
                teamB: body.teamB,
                scorer: body.scorer || user.id,
                winnerId: body.winnerId ?? null,
                matchState: body.matchState || "scheduled",
                setsPerMatchId: body.setsPerMatch || event.setsPerMatch,
                pointsPerSet: body.pointsPerSet || event.pointsPerSet,
                sideSwitching: body.sideSwitching || "per_set",
              })
              .returning({ id: matchTable.id });

            const newMatch = insertedMatches[0];
            if (!newMatch) throw new Error("Failed to create match");

            return newMatch.id;
          });

          return sendResponse({
            success: true,
            message: "Match created successfully",
            data: { matchId },
          });
        } catch (error) {
          console.error("[match/create] failed", error);
          return sendResponse({
            success: false,
            message: "Failed to create match",
          });
        }
      },
      {
        body: t.Object({
          eventId: t.String(),
          roundNumber: t.Number(),
          teamA: t.String(),
          teamB: t.String(),
          scorer: t.Optional(t.String()),
          winnerId: t.Optional(t.Nullable(t.String())),
          matchState: t.Optional(
            t.Union([
              t.Literal("scheduled"),
              t.Literal("in_progress"),
              t.Literal("completed"),
              t.Literal("abandoned"),
              t.Literal("walkover"),
            ]),
          ),
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
      },
    )
    .post(
      "/update-state",
      async ({ user, db, body }) => {
        try {
          const match = await db.query.matchTable.findFirst({
            where: { id: body.matchId },
            with: {
              event: {
                with: {
                  tournament: true,
                },
              },
            },
          });

          if (!match || !match.event || !match.event.tournament) {
            return sendResponse({
              success: false,
              message: "Match or related tournament not found",
            });
          }

          // Allow scorer or org member to update state
          const isScorer = match.scorer === user.id;
          const member = await db.query.organizationMemberTable.findFirst({
            where: {
              organizationId: match.event.tournament.organizationId,
              userId: user.id,
            },
          });

          if (!isScorer && !member) {
            return sendResponse({
              success: false,
              message: "You are not authorized to update this match state",
            });
          }

          await db
            .update(matchTable)
            .set({
              matchState: body.state,
              winnerId: body.winnerId ?? null,
            })
            .where(eq(matchTable.id, body.matchId));

          return sendResponse({
            success: true,
            message: "Match state updated successfully",
          });
        } catch (error) {
          console.error("[match/update-state] failed", error);
          return sendResponse({
            success: false,
            message: "Failed to update match state",
          });
        }
      },
      {
        body: t.Object({
          matchId: t.String(),
          state: t.Union([
            t.Literal("scheduled"),
            t.Literal("in_progress"),
            t.Literal("completed"),
            t.Literal("abandoned"),
            t.Literal("walkover"),
          ]),
          winnerId: t.Optional(t.Nullable(t.String())),
        }),
      },
    )
    .post(
      "/update-score",
      async ({ user, db, body }) => {
        try {
          const match = await db.query.matchTable.findFirst({
            where: { id: body.matchId },
            with: {
              event: {
                with: {
                  tournament: true,
                },
              },
            },
          });

          if (!match || !match.event || !match.event.tournament) {
            return sendResponse({
              success: false,
              message: "Match or related tournament not found",
            });
          }

          const isScorer = match.scorer === user.id;
          const member = await db.query.organizationMemberTable.findFirst({
            where: {
              organizationId: match.event.tournament.organizationId,
              userId: user.id,
            },
          });

          if (!isScorer && !member) {
            return sendResponse({
              success: false,
              message: "You are not authorized to update scores for this match",
            });
          }

          await db.transaction(async (tx) => {
            // Check if set already exists
            const existingSet = await tx.query.setTable.findFirst({
              where: {
                matchId: body.matchId,
                setNumber: body.setNumber,
              },
            });

            if (existingSet) {
              await tx
                .update(setTable)
                .set({
                  teamAScore: body.teamAScore,
                  teamBScore: body.teamBScore,
                  setStatus: body.setStatus,
                  winnerId: body.winnerId ?? null,
                })
                .where(eq(setTable.id, existingSet.id));
            } else {
              await tx.insert(setTable).values({
                matchId: body.matchId,
                setNumber: body.setNumber,
                teamAScore: body.teamAScore,
                teamBScore: body.teamBScore,
                setStatus: body.setStatus,
                winnerId: body.winnerId ?? null,
              });
            }

            // If match is finished, update match state and winner
            if (body.matchFinished && body.matchWinnerId) {
              await tx
                .update(matchTable)
                .set({
                  matchState: "completed",
                  winnerId: body.matchWinnerId,
                })
                .where(eq(matchTable.id, body.matchId));
            }
          });

          return sendResponse({
            success: true,
            message: "Score updated successfully",
          });
        } catch (error) {
          console.error("[match/update-score] failed", error);
          return sendResponse({
            success: false,
            message: "Failed to update score",
          });
        }
      },
      {
        body: t.Object({
          matchId: t.String(),
          setNumber: t.Number(),
          teamAScore: t.Number(),
          teamBScore: t.Number(),
          setStatus: t.Union([
            t.Literal("not_started"),
            t.Literal("in_progress"),
            t.Literal("completed"),
          ]),
          winnerId: t.Optional(t.Nullable(t.String())),
          matchFinished: t.Optional(t.Boolean()),
          matchWinnerId: t.Optional(t.Nullable(t.String())),
        }),
      },
    )
    .get(
      "/list/:eventId",
      async ({ db, params: { eventId } }) => {
        const matches = await db.query.matchTable.findMany({
          where: { eventId },
          with: {
            sets: true,
            teamAData: {
              with: {
                participants: {
                  with: {
                    user: true,
                  },
                },
              },
            },
            teamBData: {
              with: {
                participants: {
                  with: {
                    user: true,
                  },
                },
              },
            },
          },
        });

        return sendResponse({
          success: true,
          message: "Matches fetched successfully",
          data: matches,
        });
      },
      {
        params: t.Object({ eventId: t.String() }),
      },
    ),
);
