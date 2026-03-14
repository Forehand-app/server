import { protectedApi } from "@/controller";
import {
  organizationMemberTable,
  organizationTable,
} from "@/services/db/schema";
import { sendResponse } from "@/utils/response";
import { t } from "elysia";

export const orgRoutes = protectedApi.group("/org", (app) =>
  app
    .get("/list", async ({ db, user }) => {
      const orgList = await db.query.organizationTable.findMany({
        with: {
          orgType: true,
        },
        where: {
          members: {
            userId: user.id,
          },
        },
      });

      return sendResponse({
        success: true,
        message: "Organization list retrieved",
        data: orgList,
      });
    })
    .post(
      "/register",
      async ({ db, user, body }) => {
        const orgTypeId = await db.query.orgTypesTable.findFirst({
          where: { code: body.orgTypeCode },
        });
        if (!orgTypeId)
          return sendResponse({
            success: false,
            message: "Invalid organization type",
          });

        const organizationInsert = await db
          .insert(organizationTable)
          .values({
            orgTypeId: orgTypeId.id,
            name: body.name,
            description: body.description,
            establishedYear: body.establishedYear,

            website: body.website,
            contactPhone: body.contactPhone,
            contactEmail: body.contactEmail,

            address: body.address,
            city: body.city,
            state: body.state,
            postalCode: body.postalCode,
          })
          .returning({
            id: organizationTable.id,
          });

        const orgId = organizationInsert[0]!.id;

        await db.insert(organizationMemberTable).values({
          organizationId: orgId,
          userId: user.id,
          isOwner: true,
        });

        return sendResponse({
          success: true,
          message: "Organization registered successfully",
          data: orgId,
        });
      },
      {
        body: t.Object({
          orgTypeCode: t.UnionEnum([
            "educationalInstitute",
            "sportsAcademy",
            "sportsClub",
            "corporate",
            "other",
          ]),
          name: t.String(),
          description: t.String(),
          establishedYear: t.Number({
            minimum: 1600,
            maximum: new Date().getFullYear(),
          }),

          website: t.Nullable(t.String({ format: "uri" })),
          contactPhone: t.String({ pattern: "^[6-9]\\d{9}$" }),
          contactEmail: t.String({ format: "email" }),

          address: t.String(),
          city: t.String(),
          state: t.String(),
          postalCode: t.String(),
        }),
      },
    )
    .get(
      "/info/:orgId",
      async ({ db, user, params: { orgId } }) => {
        const member = await db.query.organizationMemberTable.findFirst({
          where: {
            organizationId: orgId,
            userId: user.id,
          },
        });

        if (!member)
          return sendResponse({
            success: false,
            message: "You are not a member of this organization",
          });

        console.log("is member");

        const organizationData = await db.query.organizationTable.findFirst({
          where: {
            id: orgId,
          },
          with: {
            orgType: true,
          },
        });

        const response = organizationData
          ? sendResponse({
              success: true,
              message: "Organization info retrieved",
              data: organizationData,
            })
          : sendResponse({
              success: false,
              data: null,
              message: "Organization not found",
            });

        return response;
      },
      {
        params: t.Object({
          orgId: t.String(),
        }),
      },
    ),
);
