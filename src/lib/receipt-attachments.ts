import type { SupabaseClient } from "@supabase/supabase-js";

const RECEIPT_BUCKET = "receipt-attachments";
const MAX_RECEIPT_FILE_SIZE = 8 * 1024 * 1024;

function safeFileName(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "receipt"
  );
}

function isReceiptFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

export async function uploadReceiptAttachment({
  formData,
  supabase,
  userId,
}: {
  formData: FormData;
  supabase: SupabaseClient;
  userId: string;
}) {
  const file = formData.get("receipt_file");

  if (!isReceiptFile(file)) {
    return null;
  }

  if (file.size > MAX_RECEIPT_FILE_SIZE) {
    throw new Error("Receipt photo is too large. Use a file under 8MB.");
  }

  if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
    throw new Error("Receipt upload must be an image or PDF.");
  }

  const path = `${userId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return path;
}

export async function signedReceiptUrl(
  supabase: SupabaseClient,
  attachmentUrl?: string | null,
) {
  if (!attachmentUrl) {
    return "";
  }

  if (/^https?:\/\//i.test(attachmentUrl)) {
    return attachmentUrl;
  }

  const { data } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .createSignedUrl(attachmentUrl, 60 * 30);

  return data?.signedUrl ?? "";
}

export async function signedReceiptDownloadUrl(
  supabase: SupabaseClient,
  attachmentUrl?: string | null,
) {
  if (!attachmentUrl) {
    return "";
  }

  if (/^https?:\/\//i.test(attachmentUrl)) {
    return attachmentUrl;
  }

  const fileName = attachmentUrl.split("/").at(-1) ?? "receipt";
  const { data } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .createSignedUrl(attachmentUrl, 60 * 30, {
      download: fileName,
    });

  return data?.signedUrl ?? "";
}

export async function deleteReceiptAttachment(
  supabase: SupabaseClient,
  attachmentUrl?: string | null,
) {
  if (!attachmentUrl || /^https?:\/\//i.test(attachmentUrl)) {
    return;
  }

  await supabase.storage.from(RECEIPT_BUCKET).remove([attachmentUrl]);
}
