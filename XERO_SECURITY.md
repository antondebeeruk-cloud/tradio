# Xero security notes

Tradio stores Xero OAuth tokens server-side only.

## Token encryption

Xero refresh/access tokens are encrypted before being stored in Supabase.

- Algorithm: AES-256-GCM
- Key source: `XERO_TOKEN_ENCRYPTION_KEY`
- Key format: 32-byte base64 value
- Raw token payloads must not be logged or returned to the browser.

Generate a key on the VPS:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Add the value to `/root/tradio/.env.local`:

```env
XERO_TOKEN_ENCRYPTION_KEY=PASTE_GENERATED_VALUE_HERE
```

Keep this key separate from `XERO_CLIENT_SECRET`. If this key is lost, existing
stored Xero tokens cannot be decrypted and users will need to reconnect Xero.

## OAuth callback handling

The Xero callback route only performs a server-side token exchange and then
returns a redirect to Settings. It does not render HTML with OAuth parameters in
the response body.

## Audit logging

Xero connect, callback, and disconnect events are logged in
`public.xero_audit_logs` with:

- user id
- action
- success/failure
- message
- IP address from forwarded headers
- user agent
- timestamp

Logs do not include OAuth codes, access tokens, refresh tokens, client secrets,
or customer accounting payloads.
