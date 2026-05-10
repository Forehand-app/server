import { protectedApi } from "@/controller";
import { inviteTypeTable } from "@/services/db/schema/lookups";
import {
  invitesTable,
  organizationInvitesTable,
  profileTable,
  tournamentInvitesTable,
} from "@/services/db/schema/user";
import { sendResponse } from "@/utils/response";
import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { t } from "elysia";

export const inviteRoutes = protectedApi.group("/invite", (app) =>
  app
    .post(
      "/create",
      async ({ user, db, body }) => {
        try {
          const [inviteType] = await db
            .select({
              id: inviteTypeTable.id,
            })
            .from(inviteTypeTable)
            .where(eq(inviteTypeTable.code, "tournamentCrew"))
            .limit(1);
          if (!inviteType) {
            return sendResponse({
              success: false,
              message: "Invite type configuration is missing.",
            });
          }

          const [receiver] = await db
            .select({
              id: profileTable.id,
              name: profileTable.name,
              profilePicUrl: profileTable.profilePicUrl,
            })
            .from(profileTable)
            .where(eq(profileTable.phone, body.phone))
            .limit(1);

          if (!receiver) {
            return sendResponse({
              success: false,
              message: "No user found with this phone number.",
            });
          }

          const [createdInvite] = await db
            .insert(invitesTable)
            .values({
              senderId: user.id,
              receiverId: receiver.id,
              token: randomUUID(),
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              invteTypeId: inviteType.id,
            })
            .returning({
              id: invitesTable.id,
              inviteState: invitesTable.inviteState,
            });

          await db.insert(tournamentInvitesTable).values({
            inviteId: createdInvite.id,
            tournamentId: body.tournamentId,
          });

          return sendResponse({
            success: true,
            message: "Invite created successfully",
            data: {
              inviteId: createdInvite.id,
              inviteState: createdInvite.inviteState,
              receiverName: receiver.name,
              receiverProfilePicUrl: receiver.profilePicUrl,
            },
          });
        } catch (error) {
          console.error("[invite/create] failed", {
            body,
            userId: user.id,
            error,
          });
          return sendResponse({
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "Failed to create invite due to server error.",
          });
        }
      },
      {
        body: t.Object({
          phone: t.String({ pattern: "^[6-9]\\d{9}$" }),
          role: t.Union([t.Literal("admin"), t.Literal("scorer")]),
          tournamentId: t.String(),
          organizationId: t.Optional(t.String()),
          contextType: t.Optional(t.String()),
          notifyReceiver: t.Optional(t.Boolean()),
        }),
      },
    )
    .post(
      "/organization/member/create",
      async ({ user, db, body }) => {
        try {
          const [inviteType] = await db
            .select({ id: inviteTypeTable.id })
            .from(inviteTypeTable)
            .where(eq(inviteTypeTable.code, "organization"))
            .limit(1);

          if (!inviteType) {
            return sendResponse({
              success: false,
              message: "Invite type configuration is missing for organization.",
            });
          }

          const member = await db.query.organizationMemberTable.findFirst({
            where: {
              organizationId: body.organizationId,
              userId: user.id,
            },
          });

          if (!member) {
            return sendResponse({
              success: false,
              message: "You are not a member of this organization.",
            });
          }

          const [receiver] = await db
            .select({
              id: profileTable.id,
              name: profileTable.name,
              profilePicUrl: profileTable.profilePicUrl,
              phone: profileTable.phone,
            })
            .from(profileTable)
            .where(eq(profileTable.phone, body.phone))
            .limit(1);

          if (!receiver) {
            return sendResponse({
              success: false,
              message: "No user found with this phone number.",
            });
          }

          const [createdInvite] = await db
            .insert(invitesTable)
            .values({
              senderId: user.id,
              receiverId: receiver.id,
              token: randomUUID(),
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              invteTypeId: inviteType.id,
            })
            .returning({
              id: invitesTable.id,
              inviteState: invitesTable.inviteState,
            });

          await db.insert(organizationInvitesTable).values({
            inviteId: createdInvite.id,
            organizationId: body.organizationId,
          });

          return sendResponse({
            success: true,
            message: "Organization member invite created successfully",
            data: {
              inviteId: createdInvite.id,
              inviteState: createdInvite.inviteState,
              receiverName: receiver.name,
              receiverPhone: receiver.phone,
              receiverProfilePicUrl: receiver.profilePicUrl,
            },
          });
        } catch (error) {
          console.error("[invite/organization/member/create] failed", {
            body,
            userId: user.id,
            error,
          });
          return sendResponse({
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "Failed to create organization member invite.",
          });
        }
      },
      {
        body: t.Object({
          phone: t.String({ pattern: "^[6-9]\\d{9}$" }),
          organizationId: t.String(),
          role: t.Optional(t.Union([t.Literal("admin"), t.Literal("scorer")])),
          contextType: t.Optional(t.String()),
          notifyReceiver: t.Optional(t.Boolean()),
        }),
      },
    )
    .post(
      "/organization/member/list",
      async ({ user, db, body }) => {
        const member = await db.query.organizationMemberTable.findFirst({
          where: {
            organizationId: body.organizationId,
            userId: user.id,
          },
        });

        if (!member) {
          return sendResponse({
            success: false,
            message: "You are not a member of this organization.",
          });
        }

        const rows = await db
          .select({
            inviteId: invitesTable.id,
            inviteState: invitesTable.inviteState,
            createdAt: invitesTable.createdAt,
            receiverName: profileTable.name,
            receiverPhone: profileTable.phone,
            receiverProfilePicUrl: profileTable.profilePicUrl,
          })
          .from(organizationInvitesTable)
          .innerJoin(invitesTable, eq(organizationInvitesTable.inviteId, invitesTable.id))
          .innerJoin(profileTable, eq(invitesTable.receiverId, profileTable.id))
          .where(eq(organizationInvitesTable.organizationId, body.organizationId))
          .orderBy(desc(invitesTable.createdAt));

        const data = rows.map((row) => ({
          id: row.inviteId,
          name: row.receiverName,
          phone: row.receiverPhone,
          avatarUrl: row.receiverProfilePicUrl,
          role: "admin" as const,
          inviteState: row.inviteState,
          status:
            row.inviteState === "pending"
              ? "invite_sent"
              : row.inviteState === "accepted"
                ? "accepted"
                : "rejected",
        }));

        return sendResponse({
          success: true,
          message: "Organization member invites fetched successfully",
          data,
        });
      },
      {
        body: t.Object({
          organizationId: t.String(),
        }),
      },
    )
    .post(
      "/organization/member/remove",
      async ({ user, db, body }) => {
        const [row] = await db
          .select({
            inviteId: invitesTable.id,
            senderId: invitesTable.senderId,
          })
          .from(organizationInvitesTable)
          .innerJoin(invitesTable, eq(organizationInvitesTable.inviteId, invitesTable.id))
          .where(
            and(
              eq(organizationInvitesTable.inviteId, body.inviteId),
              eq(organizationInvitesTable.organizationId, body.organizationId),
            ),
          )
          .limit(1);

        if (!row) {
          return sendResponse({
            success: false,
            message: "Organization member invite not found.",
          });
        }

        const member = await db.query.organizationMemberTable.findFirst({
          where: {
            organizationId: body.organizationId,
            userId: user.id,
          },
        });

        if (!member && row.senderId !== user.id) {
          return sendResponse({
            success: false,
            message: "You are not allowed to remove this organization member invite.",
          });
        }

        await db
          .delete(organizationInvitesTable)
          .where(
            and(
              eq(organizationInvitesTable.inviteId, body.inviteId),
              eq(organizationInvitesTable.organizationId, body.organizationId),
            ),
          );

        await db.delete(invitesTable).where(eq(invitesTable.id, body.inviteId));

        return sendResponse({
          success: true,
          message: "Organization member invite removed successfully.",
        });
      },
      {
        body: t.Object({
          inviteId: t.String(),
          organizationId: t.String(),
        }),
      },
    )
    .post(
      "/tournament/crew",
      async ({ db, body }) => {
        const rows = await db
          .select({
            inviteId: invitesTable.id,
            inviteState: invitesTable.inviteState,
            createdAt: invitesTable.createdAt,
            receiverId: profileTable.id,
            receiverName: profileTable.name,
            receiverPhone: profileTable.phone,
            receiverProfilePicUrl: profileTable.profilePicUrl,
          })
          .from(tournamentInvitesTable)
          .innerJoin(invitesTable, eq(tournamentInvitesTable.inviteId, invitesTable.id))
          .innerJoin(profileTable, eq(invitesTable.receiverId, profileTable.id))
          .where(eq(tournamentInvitesTable.tournamentId, body.tournamentId))
          .orderBy(desc(invitesTable.createdAt));

        const data = rows.map((row) => ({
          id: row.inviteId,
          role: "admin" as const,
          name: row.receiverName,
          phone: row.receiverPhone,
          avatarUrl: row.receiverProfilePicUrl,
          status:
            row.inviteState === "pending"
              ? "invite_sent"
              : row.inviteState === "accepted"
                ? "accepted"
                : "rejected",
        }));

        return sendResponse({
          success: true,
          message: "Tournament crew invites fetched successfully",
          data,
        });
      },
      {
        body: t.Object({
          tournamentId: t.String(),
        }),
      },
    )
    .post(
      "/tournament/crew/remove",
      async ({ user, db, body }) => {
        const [row] = await db
          .select({
            inviteId: invitesTable.id,
            senderId: invitesTable.senderId,
          })
          .from(tournamentInvitesTable)
          .innerJoin(invitesTable, eq(tournamentInvitesTable.inviteId, invitesTable.id))
          .where(
            and(
              eq(tournamentInvitesTable.inviteId, body.inviteId),
              eq(tournamentInvitesTable.tournamentId, body.tournamentId),
            ),
          )
          .limit(1);

        if (!row) {
          return sendResponse({
            success: false,
            message: "Crew invite not found.",
          });
        }

        if (row.senderId !== user.id) {
          return sendResponse({
            success: false,
            message: "You are not allowed to remove this crew invite.",
          });
        }

        await db
          .delete(tournamentInvitesTable)
          .where(
            and(
              eq(tournamentInvitesTable.inviteId, body.inviteId),
              eq(tournamentInvitesTable.tournamentId, body.tournamentId),
            ),
          );

        await db.delete(invitesTable).where(eq(invitesTable.id, body.inviteId));

        return sendResponse({
          success: true,
          message: "Crew invite removed successfully.",
        });
      },
      {
        body: t.Object({
          inviteId: t.String(),
          tournamentId: t.String(),
        }),
      },
    )
    .post(
      "/respond",
      async ({ user, db, body }) => {
        const invite = await db.query.invitesTable.findFirst({
          where: {
            id: body.inviteId,
            receiverId: user.id,
          },
        });

        if (!invite) {
          return sendResponse({
            success: false,
            message: "Invite not found for this user.",
          });
        }

        await db
          .update(invitesTable)
          .set({
            inviteState: body.action === "accept" ? "accepted" : "rejected",
          })
          .where(eq(invitesTable.id, body.inviteId));

        return sendResponse({
          success: true,
          message:
            body.action === "accept"
              ? "Invite accepted successfully."
              : "Invite rejected successfully.",
        });
      },
      {
        body: t.Object({
          inviteId: t.String(),
          action: t.Union([t.Literal("accept"), t.Literal("reject")]),
        }),
      },
    )
    .post("/reject-all-pending", async ({ user, db }) => {
      await db
        .update(invitesTable)
        .set({ inviteState: "rejected" })
        .where(
          and(
            eq(invitesTable.receiverId, user.id),
            eq(invitesTable.inviteState, "pending"),
          ),
        );

      return sendResponse({
        success: true,
        message: "All pending invites rejected.",
      });
    }),
);
