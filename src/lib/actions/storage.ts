"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const BUCKET = "contents";
const LISTENING_IMAGES_FOLDER = "listening-and-shadowing/images";
const PAYMENT_QR_FOLDER = "payments/qr";

export async function uploadListeningThumbnail(
  formData: FormData
): Promise<string> {
  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  const supabase = await createServerSupabaseClient();

  // Generate a unique filename to avoid collisions
  const ext = file.name.split(".").pop() ?? "jpg";
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filePath = `${LISTENING_IMAGES_FOLDER}/${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw new Error(error.message);

  // Return just the filename — the mobile app resolves the full URL
  return fileName;
}

export async function getListeningThumbnailUrl(
  fileName: string | null
): Promise<string | null> {
  if (!fileName) return null;

  const supabase = await createServerSupabaseClient();
  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(`${LISTENING_IMAGES_FOLDER}/${fileName}`);

  return data.publicUrl;
}

// Payment-method QR images live in the SAME public `contents` bucket as
// thumbnails (QRs are not sensitive and are shown to users). Store the filename;
// the mobile app resolves the public URL from the `payments/qr` folder.
export async function uploadPaymentQr(formData: FormData): Promise<string> {
  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  const supabase = await createServerSupabaseClient();

  const ext = file.name.split(".").pop() ?? "png";
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filePath = `${PAYMENT_QR_FOLDER}/${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, { contentType: file.type, upsert: false });

  if (error) throw new Error(error.message);
  return fileName;
}

export async function getPaymentQrUrl(
  fileName: string | null
): Promise<string | null> {
  if (!fileName) return null;

  const supabase = await createServerSupabaseClient();
  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(`${PAYMENT_QR_FOLDER}/${fileName}`);

  return data.publicUrl;
}
