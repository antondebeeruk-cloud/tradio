import { createClient } from "@/lib/supabase/server";

type PortalDocumentType = "invoice" | "quote";

type EnsurePortalLinkInput = {
  customerEmail?: string | null;
  documentId: string;
  documentType: PortalDocumentType;
  userId: string;
};

type PortalLinkResult = {
  error?: string;
  token?: string;
  url?: string;
};

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://tradio.uk").replace(
    /\/$/,
    "",
  );
}

function createToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

export function buildPortalUrl(token: string) {
  return `${siteUrl()}/portal/${token}`;
}

export async function ensureCustomerPortalLink({
  customerEmail,
  documentId,
  documentType,
  userId,
}: EnsurePortalLinkInput): Promise<PortalLinkResult> {
  const supabase = await createClient();
  const documentColumn = documentType === "quote" ? "quote_id" : "invoice_id";

  const { data: existingLink, error: existingError } = await supabase
    .from("customer_portal_links")
    .select("token")
    .eq("document_type", documentType)
    .eq(documentColumn, documentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingLink?.token) {
    return {
      token: existingLink.token,
      url: buildPortalUrl(existingLink.token),
    };
  }

  if (
    existingError &&
    (existingError.message.includes("customer_portal_links") ||
      existingError.message.includes("schema cache"))
  ) {
    return {
      error:
        "Customer portal links need the latest Supabase SQL. Run supabase/customer-portal.sql.",
    };
  }

  if (existingError) {
    return { error: existingError.message };
  }

  const token = createToken();
  const { data: newLink, error: insertError } = await supabase
    .from("customer_portal_links")
    .insert({
      customer_email: customerEmail || null,
      document_type: documentType,
      [documentColumn]: documentId,
      token,
      user_id: userId,
    })
    .select("token")
    .single();

  if (insertError || !newLink?.token) {
    return {
      error: insertError?.message ?? "Customer portal link could not be created.",
    };
  }

  return {
    token: newLink.token,
    url: buildPortalUrl(newLink.token),
  };
}
