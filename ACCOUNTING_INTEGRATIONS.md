# Tradio accounting integrations

Tradio supports secure OAuth connection foundations for Xero, Sage Business Cloud Accounting and QuickBooks Online. Provider credentials and tokens are server-only and must never use a `NEXT_PUBLIC_` environment variable.

## 1. Supabase

Open the Supabase SQL editor, paste the contents of `supabase/accounting-integrations.sql`, and run it once. Do not paste the filename itself.

The connection and audit tables have Row Level Security enabled with no browser policies. Tradio accesses them only with the server-side Supabase service role.

## 2. Token encryption

Generate one 32-byte base64 key on the VPS:

```bash
openssl rand -base64 32
```

Add it to `/root/tradio/.env.local`:

```env
ACCOUNTING_TOKEN_ENCRYPTION_KEY=PASTE_GENERATED_VALUE
```

The existing `XERO_TOKEN_ENCRYPTION_KEY` is accepted as a fallback, but the shared key above is clearer for new installations.

## 3. Sage developer app

Create a Sage Business Cloud Accounting application and register this exact callback URL:

```text
https://tradio.uk/api/accounting/sage/callback
```

Add its credentials:

```env
SAGE_CLIENT_ID=YOUR_SAGE_CLIENT_ID
SAGE_CLIENT_SECRET=YOUR_SAGE_CLIENT_SECRET
SAGE_REDIRECT_URI=https://tradio.uk/api/accounting/sage/callback
```

Tradio requests Sage Accounting API v3.1 `full_access`, exchanges the code server-side, then verifies the first available accounting business.

## 4. QuickBooks developer app

Create a QuickBooks Online application in the Intuit Developer portal and register:

```text
https://tradio.uk/api/accounting/quickbooks/callback
```

Add its credentials:

```env
QUICKBOOKS_CLIENT_ID=YOUR_QUICKBOOKS_CLIENT_ID
QUICKBOOKS_CLIENT_SECRET=YOUR_QUICKBOOKS_CLIENT_SECRET
QUICKBOOKS_REDIRECT_URI=https://tradio.uk/api/accounting/quickbooks/callback
QUICKBOOKS_ENVIRONMENT=production
```

Use `sandbox` for `QUICKBOOKS_ENVIRONMENT` while connecting an Intuit sandbox company. Change it to `production` only with production app credentials.

## 5. Deploy

```bash
cd /root/tradio
git pull --ff-only
pm2 stop tradio
rm -rf .next
npm ci
npm run build
pm2 restart tradio --update-env
pm2 save
```

Open **Settings > Accounting integrations**. Each configured provider will show a Connect button. A provider without complete server credentials displays **Server setup required** instead of starting a broken OAuth flow.

## Current scope

This release securely connects, identifies and disconnects each accounting organisation. Customer and transaction synchronisation will be built on these stored connections in the next integration stage.
