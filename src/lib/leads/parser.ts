type LeadParseInput = {
  bodyText?: string | null;
  fromEmail?: string | null;
  fromName?: string | null;
  subject?: string | null;
};

const platforms = [
  "Bark",
  "Checkatrade",
  "MyBuilder",
  "Facebook",
  "Totaljobs",
];

function labelledValue(text: string, labels: string[]) {
  for (const label of labels) {
    const match = text.match(
      new RegExp(`${label}\\s*[:\\-]\\s*([^\\n\\r]+(?:\\n(?!\\w+\\s*[:\\-]).+)*)`, "i"),
    );

    if (match?.[1]) {
      return match[1].trim().replace(/\s+/g, " ");
    }
  }

  return "";
}

function decodeHtmlEntity(entity: string) {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    copy: "(c)",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: "\"",
  };

  if (entity.startsWith("#x")) {
    return String.fromCodePoint(parseInt(entity.slice(2), 16));
  }

  if (entity.startsWith("#")) {
    return String.fromCodePoint(parseInt(entity.slice(1), 10));
  }

  return namedEntities[entity] ?? `&${entity};`;
}

export function htmlToText(html?: string | null) {
  if (!html) {
    return "";
  }

  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/(p|div|section|article|tr|table|h[1-6]|li)>/gi, "\n")
    .replace(/<(br|hr)\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&([a-z0-9#]+);/gi, (_, entity: string) =>
      decodeHtmlEntity(entity),
    )
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanText(value: string) {
  return value
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function detectBarkCustomerName(text: string) {
  const match =
    text.match(/\b([A-Z][a-z]+)\s+is looking for\b/) ??
    text.match(/\bContact\s+([A-Z][a-z]+)\b/) ??
    text.match(/\b([A-Z][a-z]+)\s+urgently needs\b/i);

  return match?.[1] ?? "";
}

function extractBarkProjectDetails(text: string) {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const startIndex = lines.findIndex((line) =>
    /project details/i.test(line),
  );
  const relevantLines = startIndex >= 0 ? lines.slice(startIndex + 1) : lines;
  const details: string[] = [];

  for (let index = 0; index < relevantLines.length - 1; index += 1) {
    const question = relevantLines[index];
    const answer = relevantLines[index + 1];

    if (!question.endsWith("?") || answer.endsWith("?")) {
      continue;
    }

    details.push(`${question} ${answer}`);
    index += 1;
  }

  return details.join("\n");
}

export function detectPhone(text: string) {
  const match =
    text.match(/(?:\+44\s?|0)(?:\d[\s().-]?){9,10}\d/g) ??
    text.match(/\b0\d{2,4}[\s*•xX-]{3,}\d{2,4}\b/g);

  return match?.[0]?.replace(/\s+/g, " ").trim() ?? "";
}

export function detectPostcode(text: string) {
  const match = text.match(
    /\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i,
  );
  return match?.[1]?.toUpperCase().replace(/\s+/, " ") ?? "";
}

export function detectSourcePlatform(text: string) {
  const haystack = text.toLowerCase();
  return (
    platforms.find((platform) => haystack.includes(platform.toLowerCase())) ??
    "Email"
  );
}

export function parseLeadEmail({
  bodyText,
  fromEmail,
  fromName,
  subject,
}: LeadParseInput) {
  const cleanBodyText = cleanText(bodyText ?? "");
  const text = [subject, fromEmail, fromName, cleanBodyText]
    .filter(Boolean)
    .join("\n");
  const barkProjectDetails = detectSourcePlatform(text) === "Bark"
    ? extractBarkProjectDetails(cleanBodyText)
    : "";
  const customerName =
    labelledValue(text, ["customer name", "name", "contact"]) ||
    detectBarkCustomerName(text) ||
    fromName ||
    "";
  const jobDescription =
    labelledValue(text, ["job description", "description", "job", "message"]) ||
    barkProjectDetails ||
    cleanBodyText ||
    "";

  return {
    customer_name: customerName,
    job_description: jobDescription.trim(),
    phone: detectPhone(text),
    postcode: detectPostcode(text),
    source_platform: detectSourcePlatform(text),
  };
}
