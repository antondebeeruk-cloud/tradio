import type { SupabaseClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { parseReceiptText } from "@/lib/receipt-parser";

const RECEIPT_BUCKET = "receipt-attachments";
const OCR_TIMEOUT_MS = 120_000;
const LOCAL_ENG_LANG_PATH =
  process.env.TESSERACT_ENG_LANG_PATH ??
  `${process.cwd()}/node_modules/@tesseract.js-data/eng/4.0.0`;

type OcrWorker = {
  recognize: (image: Buffer) => Promise<{ data: { text: string } }>;
  setParameters?: (parameters: Record<string, string>) => Promise<unknown>;
};

type ReceiptRecord = {
  attachment_url: string | null;
  category: string | null;
  description: string | null;
  document_reference: string | null;
  id: string;
  job_id: string | null;
  notes: string | null;
  purchase_date: string | null;
  quantity: number | string | null;
  supplier_name: string | null;
  total: number | string | null;
  unit_cost: number | string | null;
  user_id: string;
  vat_rate: number | string | null;
};

type JobMatchRecord = {
  customers: { name?: string | null } | { name?: string | null }[] | null;
  id: string;
  title: string;
};

const globalForOcr = globalThis as typeof globalThis & {
  tradioOcrWorker?: Promise<OcrWorker>;
};
const execFileAsync = promisify(execFile);

async function getOcrWorker() {
  if (!globalForOcr.tradioOcrWorker) {
    globalForOcr.tradioOcrWorker = import("tesseract.js").then(
      async ({ createWorker, PSM }) => {
        const worker = (await createWorker("eng", 1, {
          cachePath: "/tmp/tradio-tesseract",
          gzip: true,
          langPath: LOCAL_ENG_LANG_PATH,
        })) as OcrWorker;

        await worker.setParameters?.({
          tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        });

        return worker;
      },
    );
  }

  return globalForOcr.tradioOcrWorker;
}

async function withTimeout<T>(promise: Promise<T>) {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Receipt scan timed out.")),
          OCR_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function hasValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function hasPositiveNumber(value: unknown) {
  const number = Number(value ?? 0);

  return Number.isFinite(number) && number > 0;
}

function money(value: number) {
  return Number(value.toFixed(2));
}

function normaliseMatchText(value?: string | null) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function singleRelation<T>(relation: T | T[] | null) {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

async function findMatchingJob({
  supabase,
  text,
  userId,
}: {
  supabase: SupabaseClient;
  text: string;
  userId: string;
}) {
  const searchableText = normaliseMatchText(text);

  if (!searchableText) {
    return null;
  }

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, customers(name)")
    .eq("user_id", userId)
    .neq("status", "cancelled")
    .limit(50);

  const matchedJob = (jobs as JobMatchRecord[] | null)?.find((job) => {
    const customer = singleRelation(job.customers);
    const jobTitle = normaliseMatchText(job.title);
    const customerName = normaliseMatchText(customer?.name);

    return (
      (jobTitle.length >= 5 && searchableText.includes(jobTitle)) ||
      (customerName.length >= 5 && searchableText.includes(customerName))
    );
  });

  return matchedJob ?? null;
}

function isScannableAttachment(attachmentUrl?: string | null) {
  return Boolean(
    attachmentUrl &&
      !/^https?:\/\//i.test(attachmentUrl) &&
      /\.(jpe?g|png|webp|gif|pdf)$/i.test(attachmentUrl),
  );
}

async function recognizeWithNativeTesseract(
  buffer: Buffer,
  attachmentPath: string,
) {
  const workDir = await mkdtemp(path.join(tmpdir(), "tradio-ocr-"));
  const extension = path.extname(attachmentPath).toLowerCase() || ".png";
  const sourcePath = path.join(workDir, `receipt${extension}`);
  const imagePath = path.join(workDir, "receipt-page.png");

  try {
    await writeFile(sourcePath, buffer);

    if (extension === ".pdf") {
      await execFileAsync(
        process.env.PDFTOPPM_BIN ?? "pdftoppm",
        ["-f", "1", "-l", "1", "-singlefile", "-r", "200", "-png", sourcePath, path.join(workDir, "receipt-page")],
        {
          timeout: OCR_TIMEOUT_MS,
          windowsHide: true,
        },
      );
    }

    const { stdout } = await execFileAsync(
      process.env.TESSERACT_BIN ?? "tesseract",
      [extension === ".pdf" ? imagePath : sourcePath, "stdout", "-l", "eng", "--psm", "6"],
      {
        timeout: OCR_TIMEOUT_MS,
        windowsHide: true,
      },
    );

    return stdout.trim();
  } finally {
    await rm(workDir, { force: true, recursive: true });
  }
}

async function recognizeReceiptImage(buffer: Buffer, attachmentPath: string) {
  try {
    return await recognizeWithNativeTesseract(buffer, attachmentPath);
  } catch {
    if (/\.pdf$/i.test(attachmentPath)) {
      throw new Error(
        "PDF scan failed. Make sure poppler-utils and tesseract-ocr are installed on the server.",
      );
    }

    const worker = await getOcrWorker();
    const result = await withTimeout(worker.recognize(buffer));

    return result.data.text.trim();
  }
}

export async function processReceiptScan({
  receiptId,
  supabase,
  userId,
}: {
  receiptId: string;
  supabase: SupabaseClient;
  userId: string;
}) {
  const { data: receipt, error: receiptError } = await supabase
    .from("job_costs")
    .select(
      "id, user_id, job_id, attachment_url, category, supplier_name, document_reference, purchase_date, description, quantity, unit_cost, vat_rate, total, notes",
    )
    .eq("id", receiptId)
    .eq("user_id", userId)
    .maybeSingle<ReceiptRecord>();

  if (receiptError || !receipt) {
    return;
  }

  if (!isScannableAttachment(receipt.attachment_url)) {
    await supabase
      .from("job_costs")
      .update({
        notes: `${receipt.notes ? `${receipt.notes}\n\n` : ""}Scan failed: only image or PDF receipts can be scanned at the moment.`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", receiptId)
      .eq("user_id", userId);
    return;
  }

  const attachmentPath = receipt.attachment_url ?? "";

  try {
    const { data: fileData, error: fileError } = await supabase.storage
      .from(RECEIPT_BUCKET)
      .download(attachmentPath);

    if (fileError || !fileData) {
      throw new Error(fileError?.message ?? "Receipt file could not be opened.");
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const text = await recognizeReceiptImage(buffer, attachmentPath);
    const parsed = parseReceiptText(text);
    const matchedJob = receipt.job_id
      ? null
      : await findMatchingJob({ supabase, text, userId });
    const quantity = hasPositiveNumber(receipt.quantity)
      ? Number(receipt.quantity)
      : 1;
    const unitCost = hasPositiveNumber(receipt.unit_cost)
      ? Number(receipt.unit_cost)
      : parsed.unitCost ?? 0;
    const vatRate = hasPositiveNumber(receipt.vat_rate)
      ? Number(receipt.vat_rate)
      : parsed.vatRate ?? 0;
    const subtotal = money(quantity * unitCost);
    const vatAmount = money(subtotal * (vatRate / 100));
    const total = hasPositiveNumber(receipt.total)
      ? Number(receipt.total)
      : money(subtotal + vatAmount);

    await supabase
      .from("job_costs")
      .update({
        description: hasValue(receipt.description)
          ? receipt.description
          : parsed.description ?? "Scanned receipt",
        category:
          hasValue(receipt.category) && receipt.category !== "other"
            ? receipt.category
            : parsed.category ?? "other",
        document_reference: hasValue(receipt.document_reference)
          ? receipt.document_reference
          : parsed.documentReference || null,
        job_id: receipt.job_id ?? matchedJob?.id ?? null,
        notes: `${receipt.notes ? `${receipt.notes}\n\n` : ""}${
          matchedJob ? `Matched to job: ${matchedJob.title}\n\n` : ""
        }Scanned receipt text:\n${text || "No text found."}`,
        purchase_date: hasValue(receipt.purchase_date)
          ? receipt.purchase_date
          : parsed.purchaseDate || new Date().toISOString().slice(0, 10),
        quantity,
        subtotal,
        supplier_name: hasValue(receipt.supplier_name)
          ? receipt.supplier_name
          : parsed.supplierName || null,
        total,
        unit_cost: unitCost,
        updated_at: new Date().toISOString(),
        vat_amount: vatAmount,
        vat_rate: vatRate,
      })
      .eq("id", receiptId)
      .eq("user_id", userId);
  } catch (error) {
    await supabase
      .from("job_costs")
      .update({
        notes: `${receipt.notes ? `${receipt.notes}\n\n` : ""}Scan failed: ${
          error instanceof Error
            ? error.message
            : "Receipt scan failed. Enter the details manually."
        }`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", receiptId)
      .eq("user_id", userId);
  }
}

export function queueReceiptScan(args: {
  receiptId: string;
  supabase: SupabaseClient;
  userId: string;
}) {
  void processReceiptScan(args).catch(() => undefined);
}
