# Tradio Vercel Deployment

## 1. Confirm the app builds

Run this locally before deploying:

```bash
npm run build
```

The current project has been checked and builds successfully.

## 2. Create the Vercel project

Recommended route:

1. Push this project to GitHub.
2. In Vercel, choose **Add New Project**.
3. Import the Tradio repository.
4. Keep the framework preset as **Next.js**.
5. Keep the build command as `npm run build`.

## 3. Add environment variables in Vercel

Add these in Vercel Project Settings > Environment Variables:

```text
NEXT_PUBLIC_SUPABASE_URL=your Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=your Supabase anon public key
RESEND_API_KEY=your Resend API key
EMAIL_FROM=Tradio <noreply@yourdomain.com>
PAYPAL_ENVIRONMENT=live
PAYPAL_CLIENT_ID=your PayPal client ID
PAYPAL_CLIENT_SECRET=your PayPal client secret
PAYPAL_LITE_MONTHLY_PLAN_ID=your PayPal Lite monthly plan ID
PAYPAL_LITE_ANNUAL_PLAN_ID=your PayPal Lite annual plan ID
PAYPAL_PRO_MONTHLY_PLAN_ID=your PayPal Pro monthly plan ID
PAYPAL_PRO_ANNUAL_PLAN_ID=your PayPal Pro annual plan ID
PAYPAL_ELITE_MONTHLY_PLAN_ID=your PayPal Elite monthly plan ID
PAYPAL_ELITE_ANNUAL_PLAN_ID=your PayPal Elite annual plan ID
```

`RESEND_API_KEY` and `EMAIL_FROM` are needed for emailing quote and invoice PDFs.
The PayPal values are needed for Lite and Elite checkout.

## 4. Update Supabase auth URLs

After Vercel gives you a production URL, add these in Supabase Auth settings:

```text
Site URL:
https://your-vercel-domain.vercel.app

Redirect URL:
https://your-vercel-domain.vercel.app/auth/callback
```

If you later add a custom domain, add that callback URL too:

```text
https://yourdomain.com/auth/callback
```

## 5. Deploy

Deploy from the Vercel dashboard, then test:

1. Sign up.
2. Confirm email if Supabase requires it.
3. Log in.
4. Add a customer.
5. Create a quote.
6. Accept the quote and convert it to an invoice.
7. Open quote and invoice PDFs.
8. Send a PDF email to a customer.

## Release checklist

Every public release must update the release history before deployment:

1. Add the newest release to the top of `src/lib/releases.ts`.
2. Include its version, date, status, summary, and customer-facing features.
3. Update the application version in `package.json` and `package-lock.json`.
4. Confirm the new entry appears at `/releases` on phone and desktop.
5. Do not publish private administrator or infrastructure details in public notes.
