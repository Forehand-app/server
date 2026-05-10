import type { StorageBucket } from "@/types/storage";
import type { SupabaseServerClient } from "@/services/supabase/client";

export async function uploadImage({
  supabase,
  bucket,
  image,
}: {
  supabase: SupabaseServerClient;
  bucket: StorageBucket;
  image: File;
}): Promise<string | null> {
  const ext = image.type.split("/")[1];
  const id = crypto.randomUUID();
  const path = `${id}.${ext}`;

  console.log(
    `[Storage Utils] Uploading image to bucket: ${bucket}, path: ${path}, type: ${image.type}`,
  );
  const { error } = await supabase.storage.from(bucket).upload(path, image);

  if (error) {
    console.error(`[Storage Utils] Upload failed for bucket ${bucket}:`, error);
    return null;
  }
  console.log(`[Storage Utils] Upload successful: ${path}`);
  return path;
}

export function getImageUrl({
  supabase,
  bucket,
  path,
}: {
  supabase: SupabaseServerClient;
  bucket: StorageBucket;
  path: string;
}): string {
  console.log(
    `[Storage Utils] Getting public URL for bucket: ${bucket}, path: ${path}`,
  );
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);

  const imageUrl = new URL(urlData.publicUrl);
  imageUrl.searchParams.set("t", Date.now().toString());
  const finalUrl = imageUrl.toString();
  console.log(`[Storage Utils] Generated public URL: ${finalUrl}`);
  return finalUrl;
}

export async function removeImage({
  supabase,
  bucket,
  path,
}: {
  supabase: SupabaseServerClient;
  bucket: StorageBucket;
  path: string;
}) {
  console.log(
    `[Storage Utils] Removing image from bucket: ${bucket}, path: ${path}`,
  );
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    console.error(`[Storage Utils] Remove failed for bucket ${bucket}:`, error);
  } else {
    console.log(`[Storage Utils] Remove successful: ${path}`);
  }
}

export async function updateImage({
  supabase,
  bucket,
  path,
  image,
}: {
  supabase: SupabaseServerClient;
  bucket: StorageBucket;
  path: string;
  image: File;
}) {
  console.log(
    `[Storage Utils] Updating image in bucket: ${bucket}, old path: ${path}`,
  );
  await removeImage({ supabase, bucket, path });
  const updatedPath = await uploadImage({ supabase, bucket, image });
  console.log(`[Storage Utils] Update complete. New path: ${updatedPath}`);
  return updatedPath;
}
