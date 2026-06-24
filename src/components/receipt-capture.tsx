"use client";

import { Camera, FileText, Loader2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";

type ParsedReceipt = {
  description?: string;
  documentReference?: string;
  purchaseDate?: string;
  supplierName?: string;
  total?: number;
  unitCost?: number;
  vatAmount?: number;
  vatRate?: number;
};

function parseMoney(value?: string | null) {
  if (!value) {
    return null;
  }

  const cleanValue = value.replace(/,/g, "").replace(/[^\d.]/g, "");
  const parsed = Number(cleanValue);

  return Number.isFinite(parsed) ? parsed : null;
}

function formatMoney(value: number) {
  return value.toFixed(2);
}

function normaliseDate(value: string) {
  const isoMatch = value.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);

  if (isoMatch) {
    const [, year, month, day] = isoMatch;

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const ukMatch = value.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);

  if (!ukMatch) {
    return "";
  }

  const [, day, month, rawYear] = ukMatch;
  const year =
    rawYear.length === 2
      ? `${Number(rawYear) > 70 ? "19" : "20"}${rawYear}`
      : rawYear;

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function matchLastMoney(text: string, patterns: RegExp[]) {
  const matches = patterns.flatMap((pattern) =>
    Array.from(text.matchAll(pattern)).map((match) => parseMoney(match[1])),
  );
  const values = matches.filter((value): value is number => value !== null);

  return values.at(-1) ?? null;
}

function parseReceiptText(text: string): ParsedReceipt {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const joinedText = lines.join("\n");
  const supplierName =
    lines.find(
      (line) =>
        line.length > 2 &&
        line.length < 60 &&
        !/receipt|invoice|total|subtotal|vat|date|card|cash|change|tel|phone/i.test(
          line,
        ),
    ) ?? lines[0];
  const purchaseDate = normaliseDate(joinedText);
  const documentReference =
    joinedText.match(
      /\b(?:receipt|invoice|inv|ref|reference|transaction|order)\s*(?:no|number|#|:)?\s*([A-Z0-9][A-Z0-9-/]{3,})/i,
    )?.[1] ?? "";
  const subtotal =
    matchLastMoney(joinedText, [
      /\bsub\s*total\b[^\d£]{0,20}(?:£|gbp)?\s*([0-9]+(?:[.,][0-9]{2})?)/gi,
      /\bnet\b[^\d£]{0,20}(?:£|gbp)?\s*([0-9]+(?:[.,][0-9]{2})?)/gi,
    ]) ?? null;
  const vatAmount = matchLastMoney(joinedText, [
    /\bvat\b[^\d£]{0,20}(?:£|gbp)?\s*([0-9]+(?:[.,][0-9]{2})?)/gi,
  ]);
  const labelledTotal = matchLastMoney(joinedText, [
    /\bgrand\s+total\b[^\d£]{0,20}(?:£|gbp)?\s*([0-9]+(?:[.,][0-9]{2})?)/gi,
    /\bamount\s+due\b[^\d£]{0,20}(?:£|gbp)?\s*([0-9]+(?:[.,][0-9]{2})?)/gi,
    /\bbalance\s+due\b[^\d£]{0,20}(?:£|gbp)?\s*([0-9]+(?:[.,][0-9]{2})?)/gi,
    /\btotal\b[^\d£]{0,20}(?:£|gbp)?\s*([0-9]+(?:[.,][0-9]{2})?)/gi,
  ]);
  const moneyValues = Array.from(
    joinedText.matchAll(/(?:£|gbp)\s*([0-9]+(?:[.,][0-9]{2})?)/gi),
  )
    .map((match) => parseMoney(match[1]))
    .filter((value): value is number => value !== null);
  const total = labelledTotal ?? (moneyValues.length ? Math.max(...moneyValues) : null);
  const vatRateMatch = joinedText.match(/\bvat\b[^\d%]{0,12}(\d{1,2}(?:\.\d+)?)\s*%/i);
  const vatRateFromText = vatRateMatch ? Number(vatRateMatch[1]) : null;
  const vatRate =
    vatRateFromText && Number.isFinite(vatRateFromText)
      ? vatRateFromText
      : vatAmount && subtotal
        ? Number(((vatAmount / subtotal) * 100).toFixed(2))
        : 0;
  const unitCost =
    subtotal ??
    (total && vatAmount ? Number((total - vatAmount).toFixed(2)) : total ?? 0);

  return {
    description: supplierName ? `Receipt from ${supplierName}` : "Receipt purchase",
    documentReference,
    purchaseDate,
    supplierName,
    total: total ?? undefined,
    unitCost,
    vatAmount: vatAmount ?? undefined,
    vatRate,
  };
}

function setFormValue(form: HTMLFormElement, name: string, value?: string | number) {
  if (value === undefined || value === null || value === "") {
    return;
  }

  const field = form.elements.namedItem(name);

  if (
    field instanceof HTMLInputElement ||
    field instanceof HTMLTextAreaElement ||
    field instanceof HTMLSelectElement
  ) {
    field.value = String(value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

export function ReceiptCapture() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [rawText, setRawText] = useState("");
  const [status, setStatus] = useState<"idle" | "reading" | "done">("idle");
  const parsedPreview = useMemo(
    () => (rawText ? parseReceiptText(rawText) : null),
    [rawText],
  );

  async function scanReceipt(file: File) {
    const form = inputRef.current?.closest("form");

    if (!(form instanceof HTMLFormElement)) {
      setError("Receipt form was not found.");
      return;
    }

    setError("");
    setProgress(0);
    setRawText("");
    setStatus("reading");
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const { recognize } = await import("tesseract.js");
      const result = await recognize(file, "eng", {
        logger: (message) => {
          if (message.status === "recognizing text") {
            setProgress(Math.round((message.progress ?? 0) * 100));
          }
        },
      });
      const text = result.data.text.trim();
      const parsed = parseReceiptText(text);

      setRawText(text || "No text found.");
      setFormValue(form, "cost_type", "receipt");
      setFormValue(form, "supplier_name", parsed.supplierName);
      setFormValue(form, "document_reference", parsed.documentReference);
      setFormValue(form, "purchase_date", parsed.purchaseDate);
      setFormValue(form, "description", parsed.description);
      setFormValue(form, "quantity", "1");
      setFormValue(form, "unit_cost", formatMoney(parsed.unitCost ?? 0));
      setFormValue(form, "vat_rate", parsed.vatRate ?? 0);
      setFormValue(
        form,
        "notes",
        `Scanned receipt text:\n${text || "No text found."}`,
      );
      setStatus("done");
    } catch (scanError) {
      setError(
        scanError instanceof Error
          ? scanError.message
          : "Receipt scan failed. You can still enter the details manually.",
      );
      setStatus("idle");
    }
  }

  return (
    <div className="xl:col-span-3 rounded-lg border border-field bg-white p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Camera aria-hidden="true" className="text-copper" size={18} />
            <h3 className="text-sm font-semibold">Scan receipt photo</h3>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Take a photo or upload an image. Tradio will try to fill the cost
            details, then you can check them before saving.
          </p>
        </div>
        <label className="btn-secondary cursor-pointer">
          <Camera aria-hidden="true" size={16} />
          Take or upload photo
          <input
            ref={inputRef}
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                void scanReceipt(file);
              }
            }}
            type="file"
          />
        </label>
      </div>

      {status === "reading" ? (
        <div className="mt-4 rounded-lg bg-mist p-3 text-sm text-slate-600">
          <div className="flex items-center gap-2 font-semibold text-ink">
            <Loader2 aria-hidden="true" className="animate-spin" size={16} />
            Reading receipt photo
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-field">
            <div
              className="h-full rounded-full bg-copper transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}

      {error ? <p className="notice mt-4">{error}</p> : null}

      {status === "done" ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[160px_1fr]">
          {previewUrl ? (
            <img
              alt="Receipt preview"
              className="h-40 w-full rounded-lg border border-field object-cover"
              src={previewUrl}
            />
          ) : null}
          <div className="rounded-lg bg-mist p-4 text-sm">
            <div className="flex items-center gap-2 font-semibold text-ink">
              <FileText aria-hidden="true" size={16} />
              Extracted details
            </div>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Supplier</dt>
                <dd>{parsedPreview?.supplierName || "Not found"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Date</dt>
                <dd>{parsedPreview?.purchaseDate || "Not found"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Total</dt>
                <dd>
                  {parsedPreview?.total
                    ? `£${formatMoney(parsedPreview.total)}`
                    : "Not found"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">VAT rate</dt>
                <dd>{parsedPreview?.vatRate ?? 0}%</dd>
              </div>
            </dl>
          </div>
        </div>
      ) : null}
    </div>
  );
}
