import { createAdminClient } from "@/lib/supabase/admin";

const xeroAuthorizeUrl = "https://login.xero.com/identity/connect/authorize";
const xeroConnectionsUrl = "https://api.xero.com/connections";
const xeroTokenUrl = "https://identity.xero.com/connect/token";

export const xeroStateCookieName = "tradio_xero_oauth_state";

export const xeroScopes = [
  "openid",
  "profile",
  "email",
  "accounting.settings",
  "accounting.transactions",
  "offline_access",
];

type XeroTokenSet = {
  access_token: string;
  expires_in?: number;
  id_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

type XeroTenant = {
  authEventId?: string;
  createdDateUtc?: string;
  id?: string;
  tenantId: string;
  tenantName?: string;
  tenantType?: string;
  updatedDateUtc?: string;
};

export function requireXeroConfig() {
  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const redirectUri =
    process.env.XERO_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_SITE_URL || "https://tradio.uk"}/api/xero/callback`;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Xero environment variables are not configured.");
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
}

export function buildXeroConsentUrl(state: string) {
  const { clientId, redirectUri } = requireXeroConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: xeroScopes.join(" "),
    state,
  });

  return `${xeroAuthorizeUrl}?${params.toString()}`;
}

export async function exchangeXeroCodeForToken(code: string) {
  const { clientId, clientSecret, redirectUri } = requireXeroConfig();
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );
  const response = await fetch(xeroTokenUrl, {
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });
  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.access_token) {
    throw new Error(data?.error_description || "Could not connect to Xero.");
  }

  return data as XeroTokenSet;
}

export async function getXeroTenants(accessToken: string) {
  const response = await fetch(xeroConnectionsUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  const data = await response.json().catch(() => null);

  if (!response.ok || !Array.isArray(data)) {
    throw new Error("Could not read Xero organisations for this account.");
  }

  return data as XeroTenant[];
}

export async function saveXeroConnection({
  tenant,
  tokenSet,
  userId,
}: {
  tenant: XeroTenant;
  tokenSet: XeroTokenSet;
  userId: string;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("xero_connections").upsert({
    connected_at: new Date().toISOString(),
    scopes: tokenSet.scope ?? xeroScopes.join(" "),
    tenant_id: tenant.tenantId,
    tenant_name: tenant.tenantName ?? null,
    tenant_type: tenant.tenantType ?? null,
    token_set: tokenSet,
    updated_at: new Date().toISOString(),
    user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getXeroConnectionStatus(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("xero_connections")
    .select("tenant_id, tenant_name, tenant_type, connected_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function deleteXeroConnection(userId: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("xero_connections")
    .delete()
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}
