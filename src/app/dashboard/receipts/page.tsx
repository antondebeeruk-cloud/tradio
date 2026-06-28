import { Camera, Download, LinkIcon, ReceiptText, Trash2 } from "lucide-react";
import { redirect } from "next/navigation";
import {
  createReceipt,
  deleteReceipt,
  scanReceiptFile,
  updateReceiptJob,
} from "@/app/dashboard/receipts/actions";
import { AppShell } from "@/components/app-shell";
import { ReceiptCapture } from "@/components/receipt-capture";
import { currency, formatDate } from "@/lib/documents";
import {
  signedReceiptDownloadUrl,
  signedReceiptUrl,
} from "@/lib/receipt-attachments";
import { createClient } from "@/lib/supabase/server";

type ReceiptsPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

type CustomerRelation = { name?: string | null };
type JobRelation = {
  id?: string | null;
  title?: string | null;
  customers?: CustomerRelation | CustomerRelation[] | null;
};

const costTypeLabels: Record<string, string> = {
  receipt: "Receipt",
  supplier_invoice: "Supplier invoice",
};

const purchaseTypeLabels: Record<string, string> = {
  product: "Product",
  service: "Service",
};

const categoryLabels: Record<string, string> = {
  admin: "Admin",
  fuel: "Fuel",
  hire: "Hire",
  labour: "Labour",
  materials: "Materials",
  other: "Other",
  parking: "Parking",
  subcontractor: "Subcontractor",
  tools: "Tools",
  waste: "Waste",
};

function singleRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
}

function numberValue(value: unknown) {
  const number = Number(value ?? 0);

  return Number.isFinite(number) ? number : 0;
}

function scannedText(notes?: string | null) {
  if (!notes?.includes("Scanned receipt text:")) {
    return "";
  }

  return notes.split("Scanned receipt text:").at(-1)?.trim() ?? "";
}

function jobLabel(job: JobRelation | null | undefined) {
  if (!job) {
    return "Unallocated";
  }

  const customer = singleRelation(job.customers);
  const customerName = customer?.name ? ` - ${customer.name}` : "";

  return `${job.title ?? "Untitled job"}${customerName}`;
}

function canScanAttachment(attachmentUrl?: string | null) {
  return Boolean(
    attachmentUrl &&
      !/^https?:\/\//i.test(attachmentUrl) &&
      /\.(jpe?g|png|webp|gif|pdf)$/i.test(attachmentUrl),
  );
}

export default async function ReceiptsPage({ searchParams }: ReceiptsPageProps) {
  const search = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();

  const [jobsResult, receiptsResult] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, title, customers(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("job_costs")
      .select(
        "id, job_id, cost_type, purchase_type, category, supplier_name, document_reference, purchase_date, description, quantity, unit_cost, subtotal, vat_rate, vat_amount, total, attachment_url, notes, jobs(id,title,customers(name))",
      )
      .eq("user_id", user.id)
      .order("purchase_date", { ascending: false }),
  ]);

  const receiptsTableMissing =
    receiptsResult.error?.message.includes("job_costs") ||
    receiptsResult.error?.message.includes("schema cache");
  const firstError = jobsResult.error ?? (receiptsTableMissing ? null : receiptsResult.error);

  if (firstError) {
    redirect(`/dashboard?message=${encodeURIComponent(firstError.message)}`);
  }

  const jobs = jobsResult.data ?? [];
  const receipts = receiptsTableMissing
    ? []
    : await Promise.all(
        (receiptsResult.data ?? []).map(async (receipt) => ({
          ...receipt,
          attachmentDownloadUrl: await signedReceiptDownloadUrl(
            supabase,
            receipt.attachment_url,
          ),
          attachmentDisplayUrl: await signedReceiptUrl(
            supabase,
            receipt.attachment_url,
          ),
        })),
      );
  const unallocatedTotal = receipts
    .filter((receipt) => !receipt.job_id)
    .reduce((total, receipt) => total + numberValue(receipt.total), 0);
  const allocatedTotal = receipts
    .filter((receipt) => receipt.job_id)
    .reduce((total, receipt) => total + numberValue(receipt.total), 0);

  return (
    <AppShell active="receipts" plan={profile?.plan}>
      <header className="app-page-header">
        <div>
          <p className="eyebrow">Expenses and receipts</p>
          <h1 className="page-title">
            Capture purchases and allocate them to jobs.
          </h1>
        </div>
      </header>

      <div className="app-page-body">
        {search.message ? (
          <p className="notice mb-5">{search.message}</p>
        ) : null}
        {receiptsTableMissing ? (
          <p className="notice mb-5">
            Receipt tracking needs the latest Supabase SQL. Run
            supabase/job-costs.sql, then refresh this page.
          </p>
        ) : null}

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <article className="surface-pad">
            <p className="text-sm font-medium text-slate-500">Receipts</p>
            <p className="mt-3 text-2xl font-semibold">{receipts.length}</p>
          </article>
          <article className="surface-pad">
            <p className="text-sm font-medium text-slate-500">Allocated to jobs</p>
            <p className="mt-3 text-2xl font-semibold">{currency(allocatedTotal)}</p>
          </article>
          <article className="surface-pad">
            <p className="text-sm font-medium text-slate-500">Unallocated</p>
            <p className="mt-3 text-2xl font-semibold">{currency(unallocatedTotal)}</p>
          </article>
        </div>

        <section className="surface-pad">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-field text-forest">
              <Camera aria-hidden="true" size={20} />
            </div>
            <div>
              <h2 className="font-semibold">Add receipt or supplier invoice</h2>
              <p className="text-sm text-slate-500">
                Upload a photo and Tradio will start reading it after saving.
                PDFs are saved as viewable attachments.
              </p>
            </div>
          </div>

          <form action={createReceipt} className="grid gap-4 xl:grid-cols-3">
            <ReceiptCapture />
            <div>
              <label className="text-sm font-medium">Allocate to job</label>
              <select className="field-control" name="job_id">
                <option value="">No job yet</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {jobLabel(job)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Document type</label>
              <select className="field-control" name="cost_type">
                <option value="receipt">Receipt</option>
                <option value="supplier_invoice">Supplier invoice</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Purchase type</label>
              <select className="field-control" name="purchase_type">
                <option value="product">Product</option>
                <option value="service">Service</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <select className="field-control" name="category">
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Purchase date</label>
              <input className="field-control" name="purchase_date" type="date" />
            </div>
            <div>
              <label className="text-sm font-medium">Supplier</label>
              <input
                className="field-control"
                name="supplier_name"
                placeholder="Supplier or merchant"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Reference</label>
              <input
                className="field-control"
                name="document_reference"
                placeholder="Receipt or invoice number"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Receipt URL</label>
              <input
                className="field-control"
                name="attachment_url"
                placeholder="https://..."
                type="url"
              />
            </div>
            <div className="xl:col-span-3">
              <label className="text-sm font-medium">Description</label>
              <input
                className="field-control"
                name="description"
                placeholder="Optional - scanner can fill this from images"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Quantity</label>
              <input
                className="field-control"
                defaultValue="1"
                min="0.01"
                name="quantity"
                step="0.01"
                type="number"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Unit cost</label>
              <input
                className="field-control"
                defaultValue="0"
                min="0"
                name="unit_cost"
                step="0.01"
                type="number"
              />
            </div>
            <div>
              <label className="text-sm font-medium">VAT rate %</label>
              <input
                className="field-control"
                defaultValue="0"
                min="0"
                name="vat_rate"
                step="0.01"
                type="number"
              />
            </div>
            <div className="xl:col-span-3">
              <label className="text-sm font-medium">Notes</label>
              <textarea className="field-control min-h-20" name="notes" />
            </div>
            <div className="xl:col-span-3">
              <button className="btn-accent">
                <ReceiptText aria-hidden="true" size={16} />
                Save receipt
              </button>
            </div>
          </form>
        </section>

        <section className="surface mt-6 overflow-hidden">
          <div className="section-bar">
            <h2 className="font-semibold">Saved receipts</h2>
            <p className="mt-1 text-sm text-slate-500">
              Allocate purchases to jobs so each job shows income, expenses, and
              profit. Unallocated receipts stay here until you assign them.
            </p>
          </div>

          {receipts.length > 0 ? (
            <div className="divide-y divide-field">
              {receipts.map((receipt) => {
                const linkedJob = singleRelation(receipt.jobs);

                return (
                  <article
                    className="grid gap-5 px-5 py-5 xl:grid-cols-[minmax(240px,0.85fr)_minmax(360px,1.35fr)_auto]"
                    key={receipt.id}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{receipt.description}</h3>
                        <span className="status-pill bg-field text-forest">
                          {costTypeLabels[receipt.cost_type] ?? receipt.cost_type}
                        </span>
                        <span className="status-pill bg-[#fff5ef] text-[#d94800]">
                          {purchaseTypeLabels[receipt.purchase_type] ??
                            receipt.purchase_type}
                        </span>
                        <span className="status-pill bg-field text-forest">
                          {categoryLabels[receipt.category] ??
                            receipt.category ??
                            "Other"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {receipt.supplier_name || "No supplier"}
                        {receipt.document_reference
                          ? ` - Ref ${receipt.document_reference}`
                          : ""}
                        {receipt.purchase_date
                          ? ` - ${formatDate(receipt.purchase_date)}`
                          : ""}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        Job:{" "}
                        <span className="font-semibold text-ink">
                          {jobLabel(linkedJob)}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Qty {numberValue(receipt.quantity).toFixed(2)} x{" "}
                        {currency(numberValue(receipt.unit_cost))} + VAT{" "}
                        {numberValue(receipt.vat_rate).toFixed(2)}%
                      </p>
                      {receipt.attachmentDisplayUrl ? (
                        <div className="mt-2 flex flex-wrap gap-3">
                          <a
                            className="inline-flex items-center gap-1 text-xs font-semibold text-copper hover:underline"
                            href={receipt.attachmentDisplayUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            <LinkIcon aria-hidden="true" size={13} />
                            View file
                          </a>
                          <a
                            className="inline-flex items-center gap-1 text-xs font-semibold text-copper hover:underline"
                            download
                            href={receipt.attachmentDownloadUrl}
                          >
                            <Download aria-hidden="true" size={13} />
                            Download
                          </a>
                        </div>
                      ) : null}
                      {receipt.notes?.includes("Scanned receipt text:") ? (
                        <p className="mt-2 text-xs font-semibold text-[#177a55]">
                          File scanned
                        </p>
                      ) : null}
                      {receipt.notes?.includes("Scan failed:") ? (
                        <p className="mt-2 text-xs font-semibold text-[#d94800]">
                          Scan failed. You can retry or enter the details
                          manually.
                        </p>
                      ) : null}
                    </div>

                    <div className="rounded-lg border border-field bg-mist p-4 text-sm">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                            Supplier
                          </p>
                          <p className="mt-1 font-semibold">
                            {receipt.supplier_name || "Not captured"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                            Reference
                          </p>
                          <p className="mt-1 font-semibold">
                            {receipt.document_reference || "Not captured"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                            Subtotal
                          </p>
                          <p className="mt-1 font-semibold">
                            {currency(numberValue(receipt.subtotal))}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                            VAT
                          </p>
                          <p className="mt-1 font-semibold">
                            {currency(numberValue(receipt.vat_amount))} at{" "}
                            {numberValue(receipt.vat_rate).toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                            Category
                          </p>
                          <p className="mt-1 font-semibold">
                            {categoryLabels[receipt.category] ??
                              receipt.category ??
                              "Other"}
                          </p>
                        </div>
                      </div>

                      {scannedText(receipt.notes) ? (
                        <details className="mt-4">
                          <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.12em] text-copper">
                            Scanned text
                          </summary>
                          <p className="mt-2 max-h-32 overflow-auto whitespace-pre-line rounded-lg bg-white p-3 text-xs leading-5 text-slate-600">
                            {scannedText(receipt.notes)}
                          </p>
                        </details>
                      ) : (
                        <p className="mt-4 text-xs leading-5 text-slate-500">
                          Upload an image or PDF and scan it to fill this area
                          automatically.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 xl:min-w-80">
                      <p className="text-right text-xl font-semibold xl:text-left">
                        {currency(numberValue(receipt.total))}
                      </p>
                      <form action={updateReceiptJob} className="flex gap-2">
                        <input name="id" type="hidden" value={receipt.id} />
                        <select
                          className="field-control mt-0"
                          defaultValue={receipt.job_id ?? ""}
                          name="job_id"
                        >
                          <option value="">No job</option>
                          {jobs.map((job) => (
                            <option key={job.id} value={job.id}>
                              {jobLabel(job)}
                            </option>
                          ))}
                        </select>
                        <button className="btn-secondary">
                          <LinkIcon aria-hidden="true" size={15} />
                          Allocate
                        </button>
                      </form>
                      {canScanAttachment(receipt.attachment_url) ? (
                        <form action={scanReceiptFile}>
                          <input name="id" type="hidden" value={receipt.id} />
                          <button className="btn-secondary w-full">
                            <ReceiptText aria-hidden="true" size={15} />
                            Scan file
                          </button>
                        </form>
                      ) : null}
                      <form action={deleteReceipt}>
                        <input name="id" type="hidden" value={receipt.id} />
                        <button className="btn-secondary w-full">
                          <Trash2 aria-hidden="true" size={15} />
                          Delete
                        </button>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-field text-forest">
                <ReceiptText aria-hidden="true" size={24} />
              </div>
              <h2 className="mt-4 text-lg font-semibold">No receipts yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Add your first receipt, then allocate it to a job when you want
                it included in job profit and loss.
              </p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
