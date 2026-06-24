import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
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

type EncryptedValue = {
  algorithm: "aes-256-gcm";
  authTag: string;
  iv: string;
  value: string;
};

type XeroAuditEvent = {
  action: string;
  ipAddress?: string | null;
  message?: string;
  status: "failure" | "success";
  userAgent?: string | null;
  userId?: string | null;
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

function getTokenEncryptionKey() {
  const rawKey = process.env.XERO_TOKEN_ENCRYPTION_KEY;

  if (!rawKey) {
    throw new Error("Xero token encryption key is not configured.");
  }

  const key = Buffer.from(rawKey, "base64");

  if (key.length !== 32) {
    throw new Error(
      "Xero token encryption key must be a 32-byte base64 value.",
    );
  }

  return key;
}

export function encryptXeroTokenSet(tokenSet: XeroTokenSet): EncryptedValue {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getTokenEncryptionKey(), iv);
  const value = Buffer.concat([
    cipher.update(JSON.stringify(tokenSet), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    algorithm: "aes-256-gcm",
    authTag: authTag.toString("base64"),
    iv: iv.toString("base64"),
    value: value.toString("base64"),
  };
}

export function decryptXeroTokenSet(encryptedValue: EncryptedValue) {
  if (encryptedValue.algorithm !== "aes-256-gcm") {
    throw new Error("Unsupported Xero token encryption algorithm.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getTokenEncryptionKey(),
    Buffer.from(encryptedValue.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(encryptedValue.authTag, "base64"));
  const value = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue.value, "base64")),
    decipher.final(),
  ]);

  return JSON.parse(value.toString("utf8")) as XeroTokenSet;
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
    encrypted_token_set: encryptXeroTokenSet(tokenSet),
    scopes: tokenSet.scope ?? xeroScopes.join(" "),
    tenant_id: tenant.tenantId,
    tenant_name: tenant.tenantName ?? null,
    tenant_type: tenant.tenantType ?? null,
    token_set: null,
    updated_at: new Date().toISOString(),
    user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function logXeroAuditEvent(event: XeroAuditEvent) {
  const admin = createAdminClient();
  const { error } = await admin.from("xero_audit_logs").insert({
    action: event.action,
    ip_address: event.ipAddress ?? null,
    message: event.message ?? null,
    status: event.status,
    user_agent: event.userAgent ?? null,
    user_id: event.userId ?? null,
  });

  if (error) {
    console.error("Could not write Xero audit log", {
      action: event.action,
      status: event.status,
    });
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
