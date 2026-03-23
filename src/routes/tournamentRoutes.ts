import { protectedApi } from "@/controller";
import { eventTable, tournamentTable } from "@/services/db/schema";
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
            organization: true
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
    .post(
      "/events/create",
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

              const tournaments = await db.query.tournamentTable.findMany({
                where: {
                  organizationId: orgId,
                },
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
        .get("/user", async ({ db }) => {
          const tournaments = await db.query.tournamentTable.findMany({
            with: {
              events: {
                with: {
                  sportsOption: true
                }
              },
              organization: {
                with: {
                  orgType: true
                }
              }
            }
          });

          console.log(tournaments);

          return sendResponse({
            success: true,
            message: "Tournaments retrieved successfully",
            data: tournaments,
          });
        }),
    ),
);
