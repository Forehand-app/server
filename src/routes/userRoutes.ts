import { protectedApi } from "@/controller";
import {
  invitesTable,
  organizationInvitesTable,
  organizationTable,
  profileTable,
  tournamentInvitesTable,
  tournamentTable,
} from "@/services/db/schema";
import { getDate } from "@/utils/helpers";
import { sendResponse } from "@/utils/response";
import { and, eq } from "drizzle-orm";
import { t } from "elysia";

export const userRoutes = protectedApi.group("/user", (app) =>
  app
    .get("/notifications", async ({ user, db }) => {
      const tournamentRows = await db
        .select({
          id: invitesTable.id,
          inviteState: invitesTable.inviteState,
          createdAt: invitesTable.createdAt,
          sourceName: tournamentTable.name,
        })
        .from(invitesTable)
        .innerJoin(
          tournamentInvitesTable,
          eq(invitesTable.id, tournamentInvitesTable.inviteId),
        )
        .innerJoin(
          tournamentTable,
          eq(tournamentInvitesTable.tournamentId, tournamentTable.id),
        )
        .where(
          and(
            eq(invitesTable.receiverId, user.id),
            eq(invitesTable.inviteState, "pending"),
          ),
        );

      const organizationRows = await db
        .select({
          id: invitesTable.id,
          inviteState: invitesTable.inviteState,
          createdAt: invitesTable.createdAt,
          sourceName: organizationTable.name,
        })
        .from(invitesTable)
        .innerJoin(
          organizationInvitesTable,
          eq(invitesTable.id, organizationInvitesTable.inviteId),
        )
        .innerJoin(
          organizationTable,
          eq(organizationInvitesTable.organizationId, organizationTable.id),
        )
        .where(
          and(
            eq(invitesTable.receiverId, user.id),
            eq(invitesTable.inviteState, "pending"),
          ),
        );

      const notifications = [
        ...tournamentRows.map((row) => ({
          id: row.id,
          type: "invite",
          title: "Tournament Crew Invite",
          body: `You were invited to ${row.sourceName}.`,
          source: row.sourceName,
          createdAt: row.createdAt,
          unread: row.inviteState === "pending",
        })),
        ...organizationRows.map((row) => ({
          id: row.id,
          type: "invite",
          title: "Organization Invite",
          body: `You were invited to join ${row.sourceName}.`,
          source: row.sourceName,
          createdAt: row.createdAt,
          unread: row.inviteState === "pending",
        })),
      ].sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      });

      return sendResponse({
        success: true,
        message: "Notifications fetched",
        data: notifications,
      });
    })
    .get("/profile", async ({ user, db }) => {
      const userProfile = await db.query.profileTable.findFirst({
        where: { id: user.id },
      });

      console.log(userProfile?.dob);

      return sendResponse({
        success: true,
        message: "User found",
        data: userProfile,
      });
    })
    .post(
      "/validate-contact",
      async ({ db, body, user }) => {
        const duplicateContact = await db.query.profileTable.findFirst({
          where: {
            NOT: {
              id: user.id,
            },
            phone: body.data,
          },
        });

        const response = sendResponse(
          duplicateContact
            ? {
                success: true,
                data: false,
                message: "Contact is already used!",
              }
            : {
                success: true,
                data: true,
                message: "Contact is valid!",
              },
        );

        console.log(response);
        return response;
      },
      {
        body: t.Object({
          data: t.String({ pattern: "^[6-9]\\d{9}$" }),
        }),
      },
    )
    .post(
      "/register",
      async ({ user, db, body }) => {
        // TDOD: Added duplicate check
        await db.insert(profileTable).values({
          id: user.id,
          name: body.name,
          phone: body.phone,
          gender: body.gender,
          dob: getDate(body.dob),
          playingHand: body.playingHand,
          primarySport: body.primarySport,
        });

        return sendResponse({
          message: "Created Profile",
          success: true,
        });
      },
      {
        body: t.Object({
          name: t.String(),
          phone: t.String({ pattern: "^[6-9]\\d{9}$" }),
          gender: t.UnionEnum(["male", "female"]),
          dob: t.String(),
          playingHand: t.Nullable(t.UnionEnum(["left", "right"])),
          primarySport: t.Nullable(t.String()),
        }),
      },
    )
    .put(
      "/update",
      async ({ user, db, body }) => {
        const utcDob = new Date(body.dob);
        const systemDob = new Date(
          utcDob.getTime() - utcDob.getTimezoneOffset() * 60000,
        );

        await db
          .update(profileTable)
          .set({
            name: body.name,
            phone: body.phone,
            gender: body.gender,
            dob: systemDob,
            playingHand: body.playingHand,
            primarySport: body.primarySport,
          })
          .where(eq(profileTable.id, user.id));

        console.log(new Date(body.dob));
        return sendResponse({
          message: "Profile Updated",
          success: true,
        });
      },
      {
        body: t.Object({
          name: t.String(),
          phone: t.String({ pattern: "^[6-9]\\d{9}$" }),
          gender: t.UnionEnum(["male", "female"]),
          dob: t.String(),
          playingHand: t.Nullable(t.UnionEnum(["left", "right"])),
          primarySport: t.Nullable(t.String()),
        }),
      },
    ),
);
