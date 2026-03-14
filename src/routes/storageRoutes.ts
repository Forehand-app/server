import { protectedApi } from "@/controller";
import { organizationTable, profileTable } from "@/services/db/schema";
import type { StorageBucket } from "@/types/storage";
import { sendResponse } from "@/utils/response";
import { getImageUrl, updateImage, uploadImage } from "@/utils/storage";
import { eq } from "drizzle-orm";
import { t } from "elysia";

export const storageRoutes = protectedApi.group("/storage", (app) =>
  app.group("/upload", (updateApp) =>
    updateApp
      .post(
        "/profile",
        async ({ user, supabase, db, body: { image } }) => {
          // Get old path
          const profilePicPathQuery = await db.query.profileTable.findFirst({
            columns: { profilePicPath: true },
            where: { id: user.id },
          });

          let profilePicPath: string | null;

          if (!profilePicPathQuery?.profilePicPath) {
            // Upload new image if path doesn't exist
            profilePicPath = await uploadImage({
              bucket: "profile_avatars",
              supabase,
              image,
            });
          } else {
            // Update old image if path exists
            profilePicPath = await updateImage({
              path: profilePicPathQuery.profilePicPath,
              bucket: "profile_avatars",
              supabase,
              image,
            });
          }

          if (!profilePicPath)
            return sendResponse({
              success: false,
              message: "Failed to update profile avatar",
            });

          // Get new signed url
          const imageUrl = getImageUrl({
            supabase,
            bucket: "profile_avatars",
            path: profilePicPath,
          });

          await db
            .update(profileTable)
            .set({
              profilePicUrl: imageUrl,
              profilePicPath,
            })
            .where(eq(profileTable.id, user.id));

          return sendResponse({
            success: true,
            message: "Profile avatar updated successfully",
          });
        },
        {
          body: t.Object({ image: t.File({ type: "image" }) }),
        },
      )
      .post(
        "organization/:orgId",
        async ({ supabase, db, user, body: { image }, params: { orgId } }) => {
          // Check membership
          const member = await db.query.organizationMemberTable.findFirst({
            where: { organizationId: orgId, userId: user.id },
          });

          if (!member)
            return sendResponse({
              success: false,
              message: "You are not part of this organization",
            });

          // Get old path
          const orgLogoPathQuery = await db.query.organizationTable.findFirst({
            columns: { logoPath: true },
            where: { id: orgId },
          });

          let orgLogoPath: string | null;

          if (!orgLogoPathQuery?.logoPath) {
            // Upload new image if path doesn't exist
            orgLogoPath = await uploadImage({
              bucket: "organization_logos",
              supabase,
              image,
            });
          } else {
            // Update old image if path exists
            orgLogoPath = await updateImage({
              path: orgLogoPathQuery.logoPath,
              bucket: "organization_logos",
              supabase,
              image,
            });
          }
          if (!orgLogoPath) {
            return sendResponse({
              success: false,
              message: "Failed to update organization logo",
            });
          }

          // Get new signed url
          const imageUrl = getImageUrl({
            bucket: "organization_logos",
            path: orgLogoPath,
            supabase,
          });

          await db
            .update(organizationTable)
            .set({
              logoUrl: imageUrl,
              logoPath: orgLogoPath,
            })
            .where(eq(organizationTable.id, orgId));

          return sendResponse({
            success: true,
            message: "Organization logo updated successfully",
          });
        },
        {
          params: t.Object({ orgId: t.String() }),
          body: t.Object({ image: t.File({ type: "image" }) }),
        },
      ),
  ),
);
