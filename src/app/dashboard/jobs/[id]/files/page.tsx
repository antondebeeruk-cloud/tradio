import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Download,
  File,
  FileImage,
  FileText,
  FolderOpen,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import {
  deleteJobAttachment,
  updateJobFileCaption,
  uploadJobFiles,
} from "@/app/dashboard/jobs/[id]/files/actions";
import { AppShell } from "@/components/app-shell";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { formatDate } from "@/lib/documents";
import {
  signedJobFileDownloadUrl,
  signedJobFileUrl,
} from "@/lib/job-attachments";
import { hasProAccess } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

type JobFilesPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
};

type CustomerRelation = { name?: string | null };

function singleRelation<T>(relation: T | T[] | null) {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

function fileSize(value: number | string) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return "Unknown size";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function canPreviewImage(mimeType: string) {
  return ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
    mimeType,
  );
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType === "application/pdf") return FileText;
  return File;
}

export default async function JobFilesPage({
  params,
  searchParams,
}: JobFilesPageProps) {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectedFrom=/dashboard/jobs");

  const [{ data: profile }, jobResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan, subscription_status, trial_expires_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("jobs")
      .select("id, title, status, customers(name)")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!hasProAccess(profile)) {
    redirect(
      "/pricing?message=Job photos and documents are available on Tradio Pro and Elite.",
    );
  }
  if (!jobResult.data) notFound();

  const job = jobResult.data;
  const customer = singleRelation(job.customers as CustomerRelation | CustomerRelation[] | null);
  const attachmentsResult = await supabase
    .from("job_attachments")
    .select(
      "id, category, file_name, file_path, mime_type, file_size, caption, created_at",
    )
    .eq("job_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const setupNeeded = Boolean(
    attachmentsResult.error?.message.includes("job_attachments") ||
      attachmentsResult.error?.message.includes("schema cache"),
  );

  if (attachmentsResult.error && !setupNeeded) {
    redirect(
      `/dashboard/jobs?message=${encodeURIComponent(attachmentsResult.error.message)}`,
    );
  }

  const attachments = await Promise.all(
    (attachmentsResult.data ?? []).map(async (attachment) => ({
      ...attachment,
      downloadUrl: await signedJobFileDownloadUrl(
        supabase,
        attachment.file_path,
        attachment.file_name,
      ),
      viewUrl: await signedJobFileUrl(supabase, attachment.file_path),
    })),
  );
  const photos = attachments.filter((attachment) => attachment.category === "photo");
  const documents = attachments.filter(
    (attachment) => attachment.category === "document",
  );

  return (
    <AppShell active="jobs" plan={profile?.plan}>
      <header className="app-page-header">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-ink"
          href="/dashboard/jobs"
        >
          <ArrowLeft aria-hidden="true" size={16} />
          Back to jobs
        </Link>
        <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Pro job files</p>
            <h1 className="page-title">{job.title}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {customer?.name ?? "Customer removed"} · {photos.length} photo
              {photos.length === 1 ? "" : "s"} · {documents.length} document
              {documents.length === 1 ? "" : "s"}
            </p>
          </div>
          <span className="status-pill w-fit bg-[#fff0e7] text-copper">Pro feature</span>
        </div>
      </header>

      <div className="app-page-body space-y-6">
        {search.message ? <p className="notice">{search.message}</p> : null}
        {setupNeeded ? (
          <p className="notice">
            Job files need their database and storage update. Run the contents
            of supabase/job-attachments.sql in Supabase, then refresh this page.
          </p>
        ) : null}

        <section className="surface-pad">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-field text-forest">
              <Upload aria-hidden="true" size={21} />
            </div>
            <div>
              <p className="eyebrow">Add files</p>
              <h2 className="font-semibold">Upload job photos and documents</h2>
            </div>
          </div>

          <form action={uploadJobFiles} className="mt-6 grid gap-5 lg:grid-cols-[1fr_auto]">
            <input name="job_id" type="hidden" value={id} />
            <div>
              <label className="text-sm font-medium" htmlFor="job-file-caption">
                Caption for this upload
              </label>
              <input
                className="field-control"
                id="job-file-caption"
                maxLength={300}
                name="caption"
                placeholder="Before photos, boiler certificate, site plan..."
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:items-end">
              <label className="btn-secondary cursor-pointer justify-center">
                <Camera aria-hidden="true" size={17} />
                Take photo
                <input
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  disabled={setupNeeded}
                  name="job_files"
                  type="file"
                />
              </label>
              <label className="btn-secondary cursor-pointer justify-center">
                <FolderOpen aria-hidden="true" size={17} />
                Choose files
                <input
                  accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                  className="sr-only"
                  disabled={setupNeeded}
                  multiple
                  name="job_files"
                  type="file"
                />
              </label>
              <button className="btn-accent justify-center" disabled={setupNeeded}>
                <Upload aria-hidden="true" size={17} />
                Upload
              </button>
            </div>
          </form>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Upload up to six files at once. Each file can be up to 15MB. Files
            are private and links expire automatically.
          </p>
        </section>

        <section className="surface overflow-hidden">
          <div className="section-bar">
            <h2 className="font-semibold">Site photos</h2>
            <p className="mt-1 text-sm text-slate-500">
              Before, during and after photos linked to this job.
            </p>
          </div>
          {photos.length ? (
            <div className="grid gap-px bg-field sm:grid-cols-2 xl:grid-cols-3">
              {photos.map((photo) => {
                const PreviewIcon = fileIcon(photo.mime_type);
                return (
                  <article className="bg-white p-4" key={photo.id}>
                    {canPreviewImage(photo.mime_type) && photo.viewUrl ? (
                      <a href={photo.viewUrl} rel="noreferrer" target="_blank">
                        {/* Signed private URLs are temporary and cannot use Next Image. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt={photo.caption || photo.file_name}
                          className="aspect-[4/3] w-full rounded-lg border border-field object-cover"
                          src={photo.viewUrl}
                        />
                      </a>
                    ) : (
                      <a
                        className="flex aspect-[4/3] items-center justify-center rounded-lg border border-field bg-mist text-slate-400"
                        href={photo.viewUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <PreviewIcon aria-hidden="true" size={38} />
                      </a>
                    )}
                    <p className="mt-3 truncate text-sm font-semibold">{photo.file_name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {fileSize(photo.file_size)} · {formatDate(photo.created_at)}
                    </p>
                    <form action={updateJobFileCaption} className="mt-3 flex gap-2">
                      <input name="job_id" type="hidden" value={id} />
                      <input name="attachment_id" type="hidden" value={photo.id} />
                      <input
                        className="field-control mt-0 min-w-0"
                        defaultValue={photo.caption ?? ""}
                        maxLength={300}
                        name="caption"
                        placeholder="Add caption"
                      />
                      <button className="btn-secondary px-3" aria-label="Save caption">
                        <Save aria-hidden="true" size={16} />
                      </button>
                    </form>
                    <div className="mt-3 flex gap-2">
                      <a className="btn-secondary flex-1 justify-center" href={photo.downloadUrl}>
                        <Download aria-hidden="true" size={16} />Download
                      </a>
                      <form action={deleteJobAttachment}>
                        <input name="job_id" type="hidden" value={id} />
                        <input name="attachment_id" type="hidden" value={photo.id} />
                        <ConfirmSubmitButton className="btn-secondary px-3 text-red-700" message="Delete this job photo?">
                          <Trash2 aria-hidden="true" size={16} />
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-slate-500">No job photos uploaded yet.</p>
          )}
        </section>

        <section className="surface overflow-hidden">
          <div className="section-bar">
            <h2 className="font-semibold">Documents</h2>
            <p className="mt-1 text-sm text-slate-500">
              Plans, certificates, specifications and other job paperwork.
            </p>
          </div>
          {documents.length ? (
            <div className="divide-y divide-field">
              {documents.map((document) => {
                const DocumentIcon = fileIcon(document.mime_type);
                return (
                  <article className="grid gap-4 p-5 lg:grid-cols-[1fr_1fr_auto] lg:items-center" key={document.id}>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-field text-forest">
                        <DocumentIcon aria-hidden="true" size={21} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{document.file_name}</p>
                        <p className="mt-1 text-xs text-slate-500">{fileSize(document.file_size)} · {formatDate(document.created_at)}</p>
                      </div>
                    </div>
                    <form action={updateJobFileCaption} className="flex gap-2">
                      <input name="job_id" type="hidden" value={id} />
                      <input name="attachment_id" type="hidden" value={document.id} />
                      <input className="field-control mt-0 min-w-0" defaultValue={document.caption ?? ""} maxLength={300} name="caption" placeholder="Document description" />
                      <button className="btn-secondary px-3" aria-label="Save description"><Save aria-hidden="true" size={16} /></button>
                    </form>
                    <div className="flex gap-2 lg:justify-end">
                      {document.viewUrl ? <a className="btn-secondary" href={document.viewUrl} rel="noreferrer" target="_blank">View</a> : null}
                      <a className="btn-secondary" href={document.downloadUrl}><Download aria-hidden="true" size={16} />Download</a>
                      <form action={deleteJobAttachment}>
                        <input name="job_id" type="hidden" value={id} />
                        <input name="attachment_id" type="hidden" value={document.id} />
                        <ConfirmSubmitButton className="btn-secondary px-3 text-red-700" message="Delete this job document?"><Trash2 aria-hidden="true" size={16} /></ConfirmSubmitButton>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-slate-500">No job documents uploaded yet.</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}

