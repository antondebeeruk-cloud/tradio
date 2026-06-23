import { createHash, randomUUID } from "crypto";
import { extractEmailAddress, normalizeEmailAddress } from "@/lib/lead-email";
import { parseLeadEmail } from "@/lib/leads/parser";
import { createAdminClient } from "@/lib/supabase/admin";

export type LeadEmailPayload = {
  bodyHtml?: string | null;
  bodyText?: string | null;
  fromEmail?: string | null;
  fromName?: string | null;
  messageId?: string | null;
  originalRecipient?: string | null;
  rawEmail?: Record<string, unknown>;
  receivedAt?: string | null;
  subject?: string | null;
};

function fallbackMessageId(payload: LeadEmailPayload) {
  const hash = createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 24);

  return `generated-${hash}`;
}

function leadSlugFromAddress(address: string) {
  return address.split("@")[0] ?? "";
}

function maskAddress(address: string) {
  const [local, domain] = address.split("@");

  if (!local || !domain) {
    return "unknown";
  }

  return `${local.slice(0, 4)}...@${domain}`;
}

export async function ingestLeadEmail(payload: LeadEmailPayload) {
  const originalRecipient = extractEmailAddress(payload.originalRecipient);

  if (!originalRecipient) {
    return { created: false, reason: "missing-recipient", recipient: "" };
  }

  const supabase = createAdminClient();
  const { data: addressProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id, lead_email_address")
    .ilike("lead_email_address", originalRecipient)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { data: slugProfile, error: slugError } = addressProfile
    ? { data: null, error: null }
    : await supabase
        .from("profiles")
        .select("id, lead_email_address")
        .eq("lead_email_slug", leadSlugFromAddress(originalRecipient))
        .maybeSingle();

  if (slugError) {
    throw new Error(slugError.message);
  }

  const profile = addressProfile ?? slugProfile;

  if (!profile) {
    return {
      created: false,
      reason: "unknown-recipient",
      recipient: maskAddress(originalRecipient),
    };
  }

  const emailMessageId = payload.messageId || fallbackMessageId(payload);
  const { data: existing, error: existingError } = await supabase
    .from("leads")
    .select("id")
    .eq("email_message_id", emailMessageId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return {
      created: false,
      reason: "already-processed",
      recipient: maskAddress(originalRecipient),
    };
  }

  const parsed = parseLeadEmail({
    bodyText: payload.bodyText,
    fromEmail: payload.fromEmail,
    fromName: payload.fromName,
    subject: payload.subject,
  });

  const { error } = await supabase.from("leads").insert({
    body_html: payload.bodyHtml || null,
    body_text: payload.bodyText || null,
    email_message_id: emailMessageId,
    from_email: normalizeEmailAddress(payload.fromEmail),
    from_name: payload.fromName || null,
    lead_email_address: normalizeEmailAddress(profile.lead_email_address),
    original_recipient: originalRecipient,
    raw_email: payload.rawEmail ?? {},
    received_at: payload.receivedAt || new Date().toISOString(),
    subject: payload.subject || null,
    user_id: profile.id,
    ...parsed,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    created: true,
    reason: "created",
    recipient: maskAddress(originalRecipient),
  };
}

export async function createMockLeadForUser({
  leadEmailAddress,
  supabase,
  userId,
}: {
  leadEmailAddress: string;
  supabase: ReturnType<typeof import("@/lib/supabase/server").createClient>;
  userId: string;
}) {
  const bodyText = [
    "Source: Bark",
    "Customer name: Test Lead",
    "Phone: 07123 456789",
    "Postcode: SW1A 1AA",
    "Job description: Customer needs a quote for a small repair job next week.",
  ].join("\n");
  const parsed = parseLeadEmail({
    bodyText,
    fromEmail: "test.lead@example.com",
    fromName: "Test Lead",
    subject: "New Bark enquiry",
  });

  const { error } = await supabase.from("leads").insert({
    body_text: bodyText,
    email_message_id: `mock-${randomUUID()}`,
    from_email: "test.lead@example.com",
    from_name: "Test Lead",
    lead_email_address: leadEmailAddress,
    original_recipient: leadEmailAddress,
    raw_email: { mode: "mock" },
    received_at: new Date().toISOString(),
    subject: "New Bark enquiry",
    user_id: userId,
    ...parsed,
  });

  if (error) {
    throw new Error(error.message);
  }
}
