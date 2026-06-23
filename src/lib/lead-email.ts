import { randomBytes } from "crypto";

const defaultLeadDomain = "tradio.uk";

function cleanSlugPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
}

export function leadEmailDomain() {
  return process.env.LEAD_EMAIL_DOMAIN || defaultLeadDomain;
}

export function leadEmailBase({
  businessName,
  email,
  fullName,
}: {
  businessName?: string | null;
  email?: string | null;
  fullName?: string | null;
}) {
  const emailName = email?.split("@")[0] ?? "";
  return cleanSlugPart(businessName || fullName || emailName || "tradio-user");
}

export function generateLeadEmail({
  businessName,
  email,
  fullName,
}: {
  businessName?: string | null;
  email?: string | null;
  fullName?: string | null;
}) {
  const base = leadEmailBase({ businessName, email, fullName });
  const code = randomBytes(3).toString("hex").slice(0, 4);
  const leadEmailSlug = `${base}-${code}`;

  return {
    lead_email_address: `${leadEmailSlug}@${leadEmailDomain()}`,
    lead_email_slug: leadEmailSlug,
  };
}

export function normalizeEmailAddress(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

export function extractEmailAddress(value?: string | null) {
  if (!value) {
    return "";
  }

  const angleMatch = value.match(/<([^>]+)>/);
  const candidate = angleMatch?.[1] ?? value;
  const emailMatch = candidate.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  return normalizeEmailAddress(emailMatch?.[0]);
}
