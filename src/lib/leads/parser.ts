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

export function detectPhone(text: string) {
  const match = text.match(
    /(?:\+44\s?|0)(?:\d[\s().-]?){9,10}\d/g,
  );
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
  const text = [subject, fromEmail, fromName, bodyText].filter(Boolean).join("\n");
  const customerName =
    labelledValue(text, ["customer name", "name", "contact"]) || fromName || "";
  const jobDescription =
    labelledValue(text, ["job description", "description", "job", "message"]) ||
    bodyText ||
    "";

  return {
    customer_name: customerName,
    job_description: jobDescription.trim(),
    phone: detectPhone(text),
    postcode: detectPostcode(text),
    source_platform: detectSourcePlatform(text),
  };
}
