import type { SupabaseClient } from "@supabase/supabase-js";

const JOB_ATTACHMENT_BUCKET = "job-attachments";
const MAX_JOB_FILE_SIZE = 15 * 1024 * 1024;
const MAX_FILES_PER_UPLOAD = 6;

const extensionMimeTypes: Record<string, string> = {
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  pdf: "application/pdf",
  png: "image/png",
  txt: "text/plain",
  webp: "image/webp",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

const allowedMimeTypes = new Set(Object.values(extensionMimeTypes));

function safeFileName(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100) || "job-file"
  );
}

function isFile(value: FormDataEntryValue): value is File {
  return value instanceof File && value.size > 0;
}

function mimeTypeFor(file: File) {
  if (allowedMimeTypes.has(file.type)) return file.type;
  const extension = file.name.split(".").at(-1)?.toLowerCase() ?? "";
  return extensionMimeTypes[extension] ?? "";
}

export async function uploadJobAttachments({
  formData,
  jobId,
  supabase,
  userId,
}: {
  formData: FormData;
  jobId: string;
  supabase: SupabaseClient;
  userId: string;
}) {
  const files = formData.getAll("job_files").filter(isFile);

  if (!files.length) throw new Error("Choose at least one photo or document.");
  if (files.length > MAX_FILES_PER_UPLOAD) {
    throw new Error(`Upload no more than ${MAX_FILES_PER_UPLOAD} files at once.`);
  }

  const uploaded: {
    category: "document" | "photo";
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
  }[] = [];

  try {
    for (const file of files) {
      if (file.size > MAX_JOB_FILE_SIZE) {
        throw new Error(`${file.name} is larger than 15MB.`);
      }

      const mimeType = mimeTypeFor(file);
      if (!mimeType) {
        throw new Error(`${file.name} is not a supported photo or document.`);
      }

      const filePath = `${userId}/${jobId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
      const { error } = await supabase.storage
        .from(JOB_ATTACHMENT_BUCKET)
        .upload(filePath, file, {
          contentType: mimeType,
          upsert: false,
        });

      if (error) throw new Error(error.message);

      uploaded.push({
        category: mimeType.startsWith("image/") ? "photo" : "document",
        file_name: file.name.slice(0, 180),
        file_path: filePath,
        file_size: file.size,
        mime_type: mimeType,
      });
    }

    return uploaded;
  } catch (error) {
    if (uploaded.length) {
      await supabase.storage
        .from(JOB_ATTACHMENT_BUCKET)
        .remove(uploaded.map((file) => file.file_path));
    }
    throw error;
  }
}

export async function signedJobFileUrl(
  supabase: SupabaseClient,
  filePath: string,
) {
  const { data } = await supabase.storage
    .from(JOB_ATTACHMENT_BUCKET)
    .createSignedUrl(filePath, 60 * 30);
  return data?.signedUrl ?? "";
}

export async function signedJobFileDownloadUrl(
  supabase: SupabaseClient,
  filePath: string,
  fileName: string,
) {
  const { data } = await supabase.storage
    .from(JOB_ATTACHMENT_BUCKET)
    .createSignedUrl(filePath, 60 * 30, { download: fileName });
  return data?.signedUrl ?? "";
}

export async function deleteJobFile(
  supabase: SupabaseClient,
  filePath: string,
) {
  const { error } = await supabase.storage
    .from(JOB_ATTACHMENT_BUCKET)
    .remove([filePath]);
  if (error) throw new Error(error.message);
}

