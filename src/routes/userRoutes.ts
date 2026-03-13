import { protectedApi } from "@/controller";
import { profileTable } from "@/services/db/schema";
import { sendResponse } from "@/utils/response";
import { eq } from "drizzle-orm";
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
        const utcDob = new Date(body.dob);
        const systemDob = new Date(
          utcDob.getTime() - utcDob.getTimezoneOffset() * 60000,
        );
        await db.insert(profileTable).values({
          id: user.id,
          profilePicUrl: body.profilePicUrl,
          name: body.name,
          phone: body.phone,
          gender: body.gender,
          dob: systemDob,
          playingHand: body.playingHand,
          primarySport: body.primarySport,
        });

        return sendResponse({
          data: null,
          message: "Created Profile",
          success: true,
        });
      },
      {
        body: t.Object({
          profilePicUrl: t.Nullable(t.String()),
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
      "/update-profile",
      async ({ user, db, body }) => {
        const utcDob = new Date(body.dob);
        const systemDob = new Date(
          utcDob.getTime() - utcDob.getTimezoneOffset() * 60000,
        );

        await db
          .update(profileTable)
          .set({
            profilePicUrl: body.profilePicUrl,
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
          data: null,
          message: "Profile Updated",
          success: true,
        });
      },
      {
        body: t.Object({
          profilePicUrl: t.Nullable(t.String()),
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
