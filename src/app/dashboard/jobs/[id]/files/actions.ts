"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  deleteJobFile,
  uploadJobAttachments,
} from "@/lib/job-attachments";
import { hasProAccess } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry.trim() : "";
}

function filesRedirect(jobId: string, message: string): never {
  redirect(
    `/dashboard/jobs/${encodeURIComponent(jobId)}/files?message=${encodeURIComponent(message)}`,
  );
}

async function requireProJob(jobId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectedFrom=/dashboard/jobs");

  const [{ data: profile }, { data: job }] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan, subscription_status, trial_expires_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("jobs")
      .select("id")
      .eq("id", jobId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!hasProAccess(profile)) {
    redirect(
      "/pricing?message=Job photos and documents are available on Tradio Pro and Elite.",
    );
  }
  if (!job) redirect("/dashboard/jobs?message=Job not found.");

  return { supabase, user };
}

export async function uploadJobFiles(formData: FormData) {
  const jobId = value(formData, "job_id");
  if (!jobId) redirect("/dashboard/jobs?message=Job not found.");

  const { supabase, user } = await requireProJob(jobId);
  const caption = value(formData, "caption").slice(0, 300) || null;
  let uploaded: Awaited<ReturnType<typeof uploadJobAttachments>> = [];

  try {
    uploaded = await uploadJobAttachments({
      formData,
      jobId,
      supabase,
      userId: user.id,
    });

    const { error } = await supabase.from("job_attachments").insert(
      uploaded.map((file) => ({
        ...file,
        caption,
        job_id: jobId,
        user_id: user.id,
      })),
    );

    if (error) throw new Error(error.message);
  } catch (error) {
    if (uploaded.length) {
      await supabase.storage
        .from("job-attachments")
        .remove(uploaded.map((file) => file.file_path));
    }
    filesRedirect(
      jobId,
      error instanceof Error ? error.message : "Files could not be uploaded.",
    );
  }

  revalidatePath(`/dashboard/jobs/${jobId}/files`);
  filesRedirect(
    jobId,
    `${uploaded.length} file${uploaded.length === 1 ? "" : "s"} uploaded.`,
  );
}

export async function updateJobFileCaption(formData: FormData) {
  const jobId = value(formData, "job_id");
  const attachmentId = value(formData, "attachment_id");
  if (!jobId || !attachmentId) redirect("/dashboard/jobs?message=File not found.");

  const { supabase, user } = await requireProJob(jobId);
  const caption = value(formData, "caption").slice(0, 300) || null;
  const { error } = await supabase
    .from("job_attachments")
    .update({ caption })
    .eq("id", attachmentId)
    .eq("job_id", jobId)
    .eq("user_id", user.id);

  if (error) filesRedirect(jobId, error.message);
  revalidatePath(`/dashboard/jobs/${jobId}/files`);
  filesRedirect(jobId, "File caption updated.");
}

export async function deleteJobAttachment(formData: FormData) {
  const jobId = value(formData, "job_id");
  const attachmentId = value(formData, "attachment_id");
  if (!jobId || !attachmentId) redirect("/dashboard/jobs?message=File not found.");

  const { supabase, user } = await requireProJob(jobId);
  const { data: attachment } = await supabase
    .from("job_attachments")
    .select("file_path")
    .eq("id", attachmentId)
    .eq("job_id", jobId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!attachment) filesRedirect(jobId, "File not found.");

  try {
    await deleteJobFile(supabase, attachment.file_path);
    const { error } = await supabase
      .from("job_attachments")
      .delete()
      .eq("id", attachmentId)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
  } catch (error) {
    filesRedirect(
      jobId,
      error instanceof Error ? error.message : "File could not be deleted.",
    );
  }

  revalidatePath(`/dashboard/jobs/${jobId}/files`);
  filesRedirect(jobId, "File deleted.");
}

