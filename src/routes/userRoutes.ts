import { protectedApi } from "@/controller";
import {
  profileTable,
  invitesTable,
  inviteTypeTable,
  organizationInvitesTable,
  organizationTable,
  eventInvitesTable,
  eventTable,
  tournamentInvitesTable,
  tournamentTable,
} from "@/services/db/schema";
import { getDate } from "@/utils/helpers";
import { sendResponse } from "@/utils/response";
import { eq, and, ne, desc } from "drizzle-orm";
import { t } from "elysia";

export const userRoutes = protectedApi.group("/user", (app) =>
  app
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
    .get("/notifications", async ({ user, db }) => {
      try {
        const rows = await db
          .select({
            id: invitesTable.id,
            inviteState: invitesTable.inviteState,
            createdAt: invitesTable.createdAt,
            senderName: profileTable.name,
            type: inviteTypeTable.code,
            orgName: organizationTable.name,
            eventName: eventTable.name,
            tournamentName: tournamentTable.name,
          })
          .from(invitesTable)
          .innerJoin(profileTable, eq(invitesTable.senderId, profileTable.id))
          .innerJoin(
            inviteTypeTable,
            eq(invitesTable.invteTypeId, inviteTypeTable.id),
          )
          .leftJoin(
            organizationInvitesTable,
            eq(invitesTable.id, organizationInvitesTable.inviteId),
          )
          .leftJoin(
            organizationTable,
            eq(organizationInvitesTable.organizationId, organizationTable.id),
          )
          .leftJoin(
            eventInvitesTable,
            eq(invitesTable.id, eventInvitesTable.inviteId),
          )
          .leftJoin(eventTable, eq(eventInvitesTable.eventId, eventTable.id))
          .leftJoin(
            tournamentInvitesTable,
            eq(invitesTable.id, tournamentInvitesTable.inviteId),
          )
          .leftJoin(
            tournamentTable,
            eq(tournamentInvitesTable.tournamentId, tournamentTable.id),
          )
          .where(
            and(
              eq(invitesTable.receiverId, user.id),
              eq(invitesTable.inviteState, "pending"),
            ),
          )
          .orderBy(desc(invitesTable.createdAt));

        const data = rows.map((row) => ({
          id: row.id,
          inviteId: row.id,
          type: "invite",
          title:
            row.type === "organization"
              ? "Organization Invite"
              : row.type === "event"
                ? "Team Invitation"
                : "Tournament Crew Invite",
          body: `${row.senderName} has invited you.`,
          source: row.orgName || row.eventName || row.tournamentName || "",
          createdAt: row.createdAt,
          unread: true,
        }));

        return sendResponse({
          success: true,
          message: "Notifications fetched successfully",
          data,
        });
      } catch (error) {
        console.error("[user/notifications] failed", error);
        return sendResponse({
          success: false,
          message: "Failed to fetch notifications",
        });
      }
    })
    .post(
      "/validate-contact",
      async ({ db, body, user }) => {
        const result = await db
          .select()
          .from(profileTable)
          .where(
            and(
              ne(profileTable.id, user.id),
              eq(profileTable.phone, body.data),
            ),
          )
          .limit(1);

        const duplicateContact = result[0];

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
    .get(
      "/userProfile/info/:identifier",
      async ({ db, params: { identifier } }) => {
        const isPhone = /^[6-9]\d{9}$/.test(identifier);

        const profile = await db.query.profileTable.findFirst({
          where: isPhone ? { phone: identifier } : { id: identifier },
          columns: {
            id: true,
            name: true,
            profilePicUrl: true,
            profilePicPath: true,
            gender: true,
            primarySport: true,
          },
        });

        if (!profile) {
          return sendResponse({
            success: false,
            message: "User not found",
          });
        }

        return sendResponse({
          success: true,
          message: "User profile found",
          data: profile,
        });
      },
      {
        params: t.Object({
          identifier: t.String(),
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
