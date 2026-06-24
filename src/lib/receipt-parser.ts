export type ParsedReceipt = {
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

function normaliseDate(value: string) {
  const monthNames: Record<string, string> = {
    apr: "04",
    april: "04",
    aug: "08",
    august: "08",
    dec: "12",
    december: "12",
    feb: "02",
    february: "02",
    jan: "01",
    january: "01",
    jul: "07",
    july: "07",
    jun: "06",
    june: "06",
    mar: "03",
    march: "03",
    may: "05",
    nov: "11",
    november: "11",
    oct: "10",
    october: "10",
    sep: "09",
    september: "09",
  };
  const namedMatch = value.match(
    /\b(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\b/,
  );

  if (namedMatch) {
    const [, day, monthName, year] = namedMatch;
    const month = monthNames[monthName.toLowerCase()];

    if (month) {
      return `${year}-${month}-${day.padStart(2, "0")}`;
    }
  }

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

function matchLabel(text: string, label: string) {
  return (
    text.match(new RegExp(`\\b${label}\\s*:?\\s*([^\\n]+)`, "i"))?.[1]?.trim() ??
    ""
  );
}

export function parseReceiptText(text: string): ParsedReceipt {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const joinedText = lines.join("\n");
  const labelledSupplier = matchLabel(joinedText, "supplier");
  const fallbackSupplier =
    lines.find(
      (line) =>
        line.length > 2 &&
        line.length < 60 &&
        !/receipt|invoice|total|subtotal|vat|date|card|cash|change|tel|phone/i.test(
          line,
        ),
    ) ?? lines[0];
  const supplierName = labelledSupplier || fallbackSupplier;
  const purchaseDate = normaliseDate(matchLabel(joinedText, "date") || joinedText);
  const documentReference =
    joinedText.match(
      /\b(?:receipt|invoice|inv|ref|reference|transaction|order)\s*(?:no|number|#|:)?\s*([A-Z0-9][A-Z0-9-/]{3,})/i,
    )?.[1] ?? "";
  const subtotal =
    matchLastMoney(joinedText, [
      /\bsub\s*total\b[^\d\u00a3]{0,20}(?:\u00a3|gbp)?\s*([0-9]+(?:[.,][0-9]{2})?)/gi,
      /\bnet\b[^\d\u00a3]{0,20}(?:\u00a3|gbp)?\s*([0-9]+(?:[.,][0-9]{2})?)/gi,
    ]) ?? null;
  const vatAmount = matchLastMoney(joinedText, [
    /\bvat\b[^\d\u00a3]{0,25}(?:\u00a3|gbp)?\s*([0-9]+(?:[.,][0-9]{2})?)/gi,
  ]);
  const labelledTotal = matchLastMoney(joinedText, [
    /\btotal\s+due\b[^\d\u00a3]{0,20}(?:\u00a3|gbp)?\s*([0-9]+(?:[.,][0-9]{2})?)/gi,
    /\bgrand\s+total\b[^\d\u00a3]{0,20}(?:\u00a3|gbp)?\s*([0-9]+(?:[.,][0-9]{2})?)/gi,
    /\bamount\s+due\b[^\d\u00a3]{0,20}(?:\u00a3|gbp)?\s*([0-9]+(?:[.,][0-9]{2})?)/gi,
    /\bbalance\s+due\b[^\d\u00a3]{0,20}(?:\u00a3|gbp)?\s*([0-9]+(?:[.,][0-9]{2})?)/gi,
    /\btotal\b[^\d\u00a3]{0,20}(?:\u00a3|gbp)?\s*([0-9]+(?:[.,][0-9]{2})?)/gi,
  ]);
  const moneyValues = Array.from(
    joinedText.matchAll(/(?:\u00a3|gbp)\s*([0-9]+(?:[.,][0-9]{2})?)/gi),
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
