import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type AccountingProvider = "quickbooks" | "sage";

type TokenSet = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  x_refresh_token_expires_in?: number;
};

type EncryptedValue = {
  algorithm: "aes-256-gcm";
  authTag: string;
  iv: string;
  value: string;
};

export type AccountingOrganisation = {
  id: string;
  name?: string;
  provider: AccountingProvider;
};

type AuditEvent = {
  action: string;
  ipAddress?: string | null;
  message?: string;
  provider: AccountingProvider;
  status: "failure" | "success";
  userAgent?: string | null;
  userId?: string | null;
};

const sageAuthorizeUrl = "https://www.sageone.com/oauth2/auth/central";
const sageTokenUrl = "https://oauth.accounting.sage.com/token";
const sageApiUrl = "https://api.accounting.sage.com/v3.1";
const quickBooksAuthorizeUrl = "https://appcenter.intuit.com/connect/oauth2";
const quickBooksTokenUrl = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const quickBooksRevokeUrl = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";

function providerLabel(provider: AccountingProvider) {
  return provider === "quickbooks" ? "QuickBooks" : "Sage";
}

export function accountingStateCookieName(provider: AccountingProvider) {
  return `tradio_${provider}_oauth_state`;
}

function providerConfig(provider: AccountingProvider) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tradio.uk";

  if (provider === "sage") {
    const clientId = process.env.SAGE_CLIENT_ID;
    const clientSecret = process.env.SAGE_CLIENT_SECRET;
    const redirectUri =
      process.env.SAGE_REDIRECT_URI || `${siteUrl}/api/accounting/sage/callback`;
    if (!clientId || !clientSecret) {
      throw new Error("Sage environment variables are not configured.");
    }
    return { clientId, clientSecret, redirectUri };
  }

  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
  const redirectUri =
    process.env.QUICKBOOKS_REDIRECT_URI ||
    `${siteUrl}/api/accounting/quickbooks/callback`;
  if (!clientId || !clientSecret) {
    throw new Error("QuickBooks environment variables are not configured.");
  }
  return { clientId, clientSecret, redirectUri };
}

export function isAccountingProviderConfigured(provider: AccountingProvider) {
  try {
    providerConfig(provider);
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

function getEncryptionKey() {
  const rawKey =
    process.env.ACCOUNTING_TOKEN_ENCRYPTION_KEY ||
    process.env.XERO_TOKEN_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error("Accounting token encryption key is not configured.");
  }
  const key = Buffer.from(rawKey, "base64");
  if (key.length !== 32) {
    throw new Error("Accounting token encryption key must be a 32-byte base64 value.");
  }
  return key;
}

function encryptTokenSet(tokenSet: TokenSet): EncryptedValue {
  return encryptSensitiveValue(JSON.stringify(tokenSet));
}

function encryptSensitiveValue(valueToEncrypt: string): EncryptedValue {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const value = Buffer.concat([
    cipher.update(valueToEncrypt, "utf8"),
    cipher.final(),
  ]);
  return {
    algorithm: "aes-256-gcm",
    authTag: cipher.getAuthTag().toString("base64"),
    iv: iv.toString("base64"),
    value: value.toString("base64"),
  };
}

function decryptTokenSet(encrypted: EncryptedValue): TokenSet {
  if (encrypted.algorithm !== "aes-256-gcm") {
    throw new Error("Unsupported accounting token encryption algorithm.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(encrypted.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64"));
  const value = Buffer.concat([
    decipher.update(Buffer.from(encrypted.value, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(value.toString("utf8")) as TokenSet;
}

export function buildAccountingConsentUrl(
  provider: AccountingProvider,
  state: string,
) {
  const { clientId, redirectUri } = providerConfig(provider);

  if (provider === "sage") {
    const url = new URL(sageAuthorizeUrl);
    url.search = new URLSearchParams({
      client_id: clientId,
      filter: "apiv3.1",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "full_access",
      state,
    }).toString();
    return url.toString();
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting",
    state,
  });
  return `${quickBooksAuthorizeUrl}?${params.toString()}`;
}

export async function exchangeAccountingCode(
  provider: AccountingProvider,
  code: string,
) {
  const { clientId, clientSecret, redirectUri } = providerConfig(provider);
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(
    provider === "sage" ? sageTokenUrl : quickBooksTokenUrl,
    {
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    },
  );
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.access_token) {
    throw new Error(
      data?.error_description || data?.error || `Could not connect to ${providerLabel(provider)}.`,
    );
  }
  return data as TokenSet;
}

export async function getAccountingOrganisation(
  provider: AccountingProvider,
  accessToken: string,
  realmId?: string | null,
): Promise<AccountingOrganisation> {
  if (provider === "sage") {
    const response = await fetch(`${sageApiUrl}/businesses`, {
      cache: "no-store",
      headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json().catch(() => null);
    const business = data?.$items?.[0];
    if (!response.ok || !business?.id) {
      throw new Error("Sage connected, but no accounting business was available.");
    }
    return { id: business.id, name: business.displayed_as, provider };
  }

  if (!realmId || !/^\d+$/.test(realmId)) {
    throw new Error("QuickBooks did not return a valid company ID.");
  }
  const sandbox = process.env.QUICKBOOKS_ENVIRONMENT === "sandbox";
  const baseUrl = sandbox
    ? "https://sandbox-quickbooks.api.intuit.com"
    : "https://quickbooks.api.intuit.com";
  const response = await fetch(
    `${baseUrl}/v3/company/${encodeURIComponent(realmId)}/companyinfo/${encodeURIComponent(realmId)}?minorversion=75`,
    {
      cache: "no-store",
      headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
    },
  );
  const data = await response.json().catch(() => null);
  const company = data?.QueryResponse?.CompanyInfo?.[0];
  if (!response.ok) {
    throw new Error("QuickBooks connected, but the company could not be verified.");
  }
  return { id: realmId, name: company?.CompanyName, provider };
}

export async function saveAccountingConnection({
  organisation,
  tokenSet,
  userId,
}: {
  organisation: AccountingOrganisation;
  tokenSet: TokenSet;
  userId: string;
}) {
  const now = new Date().toISOString();
  const admin = createAdminClient();
  const { error } = await admin.from("accounting_connections").upsert(
    {
      connected_at: now,
      encrypted_token_set: encryptTokenSet(tokenSet),
      encrypted_organisation_id: encryptSensitiveValue(organisation.id),
      organisation_id: organisation.provider === "quickbooks" ? null : organisation.id,
      organisation_name: organisation.name ?? null,
      provider: organisation.provider,
      scopes: tokenSet.scope ?? null,
      updated_at: now,
      user_id: userId,
    },
    { onConflict: "user_id,provider" },
  );
  if (error) throw new Error(error.message);
}

export async function getAccountingConnectionStatuses(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("accounting_connections")
    .select("provider, organisation_name, connected_at, updated_at")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function deleteAccountingConnection(
  provider: AccountingProvider,
  userId: string,
) {
  const admin = createAdminClient();

  if (provider === "quickbooks") {
    try {
      const { data } = await admin
        .from("accounting_connections")
        .select("encrypted_token_set")
        .eq("user_id", userId)
        .eq("provider", provider)
        .maybeSingle();
      if (data?.encrypted_token_set) {
        const tokenSet = decryptTokenSet(data.encrypted_token_set as EncryptedValue);
        const token = tokenSet.refresh_token ?? tokenSet.access_token;
        const { clientId, clientSecret } = providerConfig(provider);
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
        await fetch(quickBooksRevokeUrl, {
          body: JSON.stringify({ token }),
          headers: {
            Accept: "application/json",
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/json",
          },
          method: "POST",
        });
      }
    } catch {
      // Local deletion must still work if provider revocation is unavailable.
    }
  }

  const { error } = await admin
    .from("accounting_connections")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);
  if (error) throw new Error(error.message);
}

export async function logAccountingAuditEvent(event: AuditEvent) {
  const admin = createAdminClient();
  const { error } = await admin.from("accounting_integration_audit_logs").insert({
    action: event.action,
    ip_address: event.ipAddress ?? null,
    message: event.message ?? null,
    provider: event.provider,
    status: event.status,
    user_agent: event.userAgent ?? null,
    user_id: event.userId ?? null,
  });
  if (error) {
    console.error("Could not write accounting integration audit log", {
      action: event.action,
      provider: event.provider,
      status: event.status,
    });
  }
}

export function parseAccountingProvider(value: string): AccountingProvider | null {
  return value === "sage" || value === "quickbooks" ? value : null;
}

export function accountingProviderLabel(provider: AccountingProvider) {
  return providerLabel(provider);
}
