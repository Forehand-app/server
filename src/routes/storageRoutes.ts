import { protectedApi } from "@/controller";
import { sendResponse } from "@/utils/response";
import { t } from "elysia";

export const storageRoutes = protectedApi.group("/storage", (app) =>
  app
    .post(
      "/upload/:type",
      async ({ user, supabase, params: { type }, body: { data } }) => {
        let id: string;
        let bucket: "profile_avatars" | "organization_logos";

        if (type == "profileAvatar") {
          id = user.id;
          bucket = "profile_avatars";
        } else {
          id = crypto.randomUUID();
          bucket = "organization_logos";
        }

        const ext = data.name.split(".").pop();
        const path = `${id}.${ext}`;
        const buffer = Buffer.from(await data.arrayBuffer());
        const { error } = await supabase.storage
          .from(bucket)
          .upload(path, buffer, {
            contentType: data.type,
          });

        if (error) {
          console.log(error);
          return sendResponse({
            success: false,
            message: "Failed to upload file",
            data: null,
          });
        }

        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(path);

        const imageUrl = new URL(urlData.publicUrl);
        imageUrl.searchParams.set("t", Date.now().toString());

        return sendResponse({
          success: true,
          message: "File uploaded successfully",
          data: imageUrl.toString(),
        });
      },
      {
        params: t.Object({
          type: t.UnionEnum(["profileAvatar", "organizationLogo"]),
        }),
        body: t.Object({
          data: t.File({
            type: "image",
          }),
        }),
      },
    )
    .group("/update", (updateApp) =>
      updateApp.post(
        "/profile-avatar",
        async ({ user, supabase, body: { data } }) => {
          const id = user.id;
          const bucket = "profile_avatars";
          const ext = data.name.split(".").pop();
          const path = `${id}.${ext}`;
          const buffer = Buffer.from(await data.arrayBuffer());
          const { error } = await supabase.storage
            .from(bucket)
            .upload(path, buffer, {
              contentType: data.type,
              upsert: true,
            });

          if (error) {
            console.log(error);
            return sendResponse({
              success: false,
              message: "Failed to update file",
              data: null,
            });
          }

          const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(path);

          const imageUrl = new URL(urlData.publicUrl);
          imageUrl.searchParams.set("t", Date.now().toString());

          return sendResponse({
            success: true,
            message: "File updated successfully",
            data: imageUrl.toString(),
          });
        },
        {
          body: t.Object({
            data: t.File({
              type: "image",
            }),
          }),
        },
      ),
    ),
);
