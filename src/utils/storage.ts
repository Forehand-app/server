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

  const { error } = await supabase.storage.from(bucket).upload(path, image);

  if (error) return null;
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
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);

  const imageUrl = new URL(urlData.publicUrl);
  imageUrl.searchParams.set("t", Date.now().toString());
  return imageUrl.toString();
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
  await supabase.storage.from(bucket).remove([path]);
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
  await supabase.storage.from(bucket).remove([path]);
  const updatedPath = await uploadImage({ supabase, bucket, image });
  return updatedPath;
}
