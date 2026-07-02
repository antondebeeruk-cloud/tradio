# Tradio Security Operations

This document records the controls used by Tradio and the operational evidence
needed for accounting-provider reviews. It is a working security record, not a
certification.

## Application controls

- HTTPS is enforced for `tradio.uk`, `www.tradio.uk`, and `admin.tradio.uk`.
- HSTS is returned on HTTPS responses.
- Sensitive and authenticated pages use `no-store` and `no-cache` response
  headers.
- TRACE, TRACK, and CONNECT requests are rejected with HTTP 405.
- Browser responses include CSP, clickjacking, MIME-sniffing, referrer, and
  device-permission protections.
- Supabase session cookies written by the Tradio server are `Secure`,
  `HttpOnly`, and `SameSite=Lax` in production.
- Accounting disconnect requests require a same-origin POST.
- OAuth state is held in a short-lived `Secure`, `HttpOnly`, `SameSite=Lax`
  cookie.
- QuickBooks access and refresh tokens and realm IDs are encrypted at rest with
  AES-256-GCM. The encryption key is held only in the server environment.
- Accounting tables have Row Level Security enabled and no browser policies.
  Only the server service-role client can read token records.
- OAuth callback endpoints return a 302 redirect with `Referrer-Policy:
  no-referrer`; token exchange responses are never sent to the browser.
- Tradio uses Supabase Auth and does not store account passwords in its own
  database.

## Required environment handling

- Keep `ACCOUNTING_TOKEN_ENCRYPTION_KEY`, `QUICKBOOKS_CLIENT_SECRET`, and the
  Supabase service-role key in the VPS environment only.
- Never prefix secrets with `NEXT_PUBLIC_`.
- Restrict `.env.local` to the deployment user: `chmod 600 .env.local`.
- Do not include environment files, OAuth responses, tokens, customer records,
  or request bodies in logs or support screenshots.
- Rotate a secret immediately if it is exposed and reconnect affected providers.

## VPS and Nginx baseline

Apply operating-system and Node.js security updates regularly. Configure Nginx
to allow TLS 1.2 and TLS 1.3 only:

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;

if ($request_method ~ ^(TRACE|TRACK|CONNECT)$) {
    return 405;
}

location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

Disable access logging for OAuth callback URLs so short-lived authorisation
codes are not written to Nginx logs. This location belongs inside the Tradio
`server` block and should use the same proxy settings as the main location:

```nginx
location ~ ^/api/accounting/(quickbooks|sage)/callback$ {
    access_log off;
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

Port 3000 must not be exposed publicly; only Nginx should be able to reach the
Next.js process.

After editing Nginx, validate its configuration before reloading it. Retain the
date of each OS, Nginx, Node.js, npm dependency, and TLS update in the security
review evidence folder.

## QuickBooks migration

Run `supabase/accounting-security-hardening.sql` once. It removes existing
QuickBooks connections whose realm IDs pre-date encrypted identifier storage.
Each affected user must reconnect QuickBooks afterward.

## Review checks

Verify these before requesting an Intuit review:

1. Confirm HTTP redirects to HTTPS for the root, login, settings, and callback.
2. Confirm authenticated responses include `Cache-Control: no-store, no-cache`.
3. Confirm session cookies show `Secure`, `HttpOnly`, and `SameSite=Lax`.
4. Confirm TRACE, TRACK, and CONNECT return 405.
5. Complete CSRF, reflected/stored XSS, SQL/XML injection, session, access
   control, and open-redirect testing.
6. Confirm one Tradio account cannot read another account's accounting records.
7. Confirm OAuth callbacks return 302 and do not include response bodies or
   sensitive logs.
8. Confirm the database stores encrypted token payloads and encrypted QuickBooks
   company identifiers, with no plaintext realm ID.
9. Run a reputable independent vulnerability scan and retain the report for the
   annual review.
10. Prepare the Intuit security affidavit and a remediation owner for findings.

Critical, high, and medium findings must be addressed before an initial listing.
For continuing reviews, track Intuit's two-week remediation window from the date
of notification.
