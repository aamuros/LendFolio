# Vercel + Supabase Deployment Guide

Complete guide for deploying LendFolio to Vercel with Supabase as the production
backend.

## Production URL

Record the deployed URL after the first successful production deployment:

```text
Production URL: TBD
```

---

## Pre-Deployment Checklist

- [ ] Supabase project created and configured (see Supabase Production Setup)
- [ ] All migrations applied to the production Supabase database
- [ ] Storage buckets created through migrations
- [ ] RLS enabled on all production tables and storage buckets
- [ ] Supabase Auth Email provider enabled
- [ ] Supabase Auth URL configuration set (Site URL + Redirect URLs include `https://lend-folio.vercel.app/**`)
- [ ] Custom SMTP configured for reliable production signup emails
- [ ] Supabase Auth rate-limit settings reviewed
- [ ] Vercel Function logs reviewed for `source: "signUp"` or `source: "resend"` signup diagnostics
- [ ] Manager account provisioned in production (see Manager Bootstrap)
- [ ] Vercel project created and linked to the GitHub repository
- [ ] Environment variables set in Vercel for both Preview and Production
- [ ] `npm run lint` passes locally
- [ ] `npm run typecheck` passes locally
- [ ] `npm run test` passes locally (251 unit tests, 29 integration tests skipped without local Supabase)
- [ ] `npm run build` passes locally
- [ ] No secrets committed to the repository

---

## Supabase Production Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note the project URL and anon key from **Settings > API**.

### 2. Apply Database Migrations

The project has 54 ordered SQL migrations covering all tables, enums, functions,
triggers, and RLS policies. Apply them to the production database:

**Option A: Supabase CLI (recommended)**

```bash
# Link to your remote project
supabase link --project-ref your-project-ref

# Push all migrations
supabase db push
```

**Option B: Supabase Dashboard**

1. Open the Supabase dashboard **SQL Editor**.
2. Run each migration file in chronological order from `supabase/migrations/`.
3. Verify all tables, enums, functions, and triggers exist.

### 3. Verify Storage Buckets

Three storage buckets are created through migrations (not manually):

| Bucket | Migration | Visibility | Size Limit | Allowed Types |
| --- | --- | --- | --- | --- |
| `borrower-verification-documents` | `20260526004411` | Private | 5 MB | JPEG, PNG, WebP, PDF |
| `repayment-proofs` | `20260524145301` | Private | 5 MB | JPEG, PNG, WebP, PDF + HEIC |
| `lender-verification-documents` | `20260531100000` | Private | 5 MB | JPEG, PNG, WebP, PDF |

Verify in **Storage > Buckets** that all three exist and are set to **private**.

### 4. Verify RLS Policies

RLS is enabled on all production tables through migrations. Key tables:

- `profiles` — users read own profile; managers read all
- `lender_profiles` — lenders read/write own; managers read/approve all
- `borrower_portfolios` — borrowers CRUD own
- `loan_applications` — borrowers manage own; approved lenders read open apps
- `loan_offers` — borrowers/lenders manage own; atomic acceptance via RPC
- `active_loans` — borrowers/lenders read own
- `loan_repayment_schedules` — borrowers/lenders read own
- `repayment_proofs` — borrowers/lenders manage own lifecycle
- `borrower_verifications` — borrowers read own; managers review
- `lender_verification_documents` — lenders upload own; managers review
- `notifications` — users read own
- `user_consents` — users insert own; managers read all
- `audit_logs` — managers read all

Storage bucket policies are also applied through migrations for all three
buckets, scoped by user role and ownership.

Do **not** disable RLS on any table or bucket in production.

### 5. Configure Authentication

1. Open **Authentication > Providers** and confirm **Email** is enabled.
2. Keep email/password sign-in enabled.
3. In **Authentication > Providers > Email**, keep **Confirm Email** turned on
   for production.
4. Configure custom SMTP for production. Supabase's default email sending is
   limited and intended mainly for testing.
5. Open **Authentication > Rate Limits** and inspect signup and email-delivery
   limits before testing repeated signups. A rate limit can apply at the
   project or delivery-provider level, so changing to a new email address will
   not reliably avoid it.
6. In **Authentication > Email Templates > Confirm signup**, use the app
   confirmation route so the server can verify the token and redirect safely:

```html
<h2>Confirm your email address</h2>

<p>Follow the link below to confirm this email address and finish signing up.</p>
<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}">
    Confirm email address
  </a>
</p>
```

### 6. Configure Auth URLs

Open **Authentication > URL Configuration** and set:

**Site URL:**

```
https://lend-folio.vercel.app
```

**Redirect URLs (add all):**

```
http://localhost:3000/**
https://lend-folio.vercel.app/**
https://*-your-project-ref.vercel.app/**
```

The `*` wildcard in the Vercel preview pattern covers all preview deployments
generated from pull requests.

---

## Required Vercel Environment Variables

Configure these in Vercel under **Settings > Environment Variables** for both
**Preview** and **Production** environments:

| Variable | Value | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project-ref.supabase.co` | From Supabase dashboard Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-public-anon-key` | From Supabase dashboard Settings > API |
| `NEXT_PUBLIC_SITE_URL` | `https://your-production-url.vercel.app` | Production URL used for auth email redirects. Falls back to request origin header, then `http://localhost:3000` for local development. |

Do **not** add a Supabase service role key to Vercel. The app only uses the
anon key for browser and server-side Supabase clients. Never expose service
role keys through `NEXT_PUBLIC_*` variables.

---

## Vercel Project Configuration

### Recommended Settings

| Setting | Value |
| --- | --- |
| Framework Preset | Next.js |
| Install Command | `npm install` |
| Build Command | `npm run build` |
| Output Directory | Next.js default (`.next`) |
| Production Branch | `main` |
| Node.js Version | 22.x (set in Vercel project settings or `engines` field) |

### Setup Steps

1. Push the repository to GitHub.
2. In Vercel, create a new project and import the GitHub repository.
3. Select the **Next.js** framework preset.
4. Keep the default build command unless Vercel detects otherwise.
5. Confirm the production branch is `main`.
6. Add environment variables (see above) for both Preview and Production.
7. Deploy once from the Vercel dashboard.
8. Push a small change to `main` to confirm automatic production deployment.

---

## Supabase Auth URL Configuration

LendFolio uses Supabase Auth for email/password sign-up, sign-in, and password
reset. The following server actions construct redirect URLs:

| Action | File | Redirect Target |
| --- | --- | --- |
| Signup | `app/signup/actions.ts` | `/login?message=email-confirmed` |
| Lender register | `app/lender/register/actions.ts` | `/login?message=email-confirmed` |
| Forgot password | `app/forgot-password/actions.ts` | `/reset-password` |

Signup and lender registration send the final post-confirmation target to
Supabase as `RedirectTo`. The Confirm signup email template above sends users to
`/auth/confirm`, where the app verifies `token_hash`, rejects cross-origin
`next` values, and then redirects to the login confirmation notice.

All auth actions resolve the origin using this priority:

1. `process.env.NEXT_PUBLIC_SITE_URL` — production URL override
2. `x-forwarded-host` / `host` request headers — Vercel deployment origin
3. `requestHeaders.get("origin")` — browser request origin fallback
4. `process.env.VERCEL_URL` — Vercel deployment URL fallback
5. `http://localhost:3000` — local development fallback

Set `NEXT_PUBLIC_SITE_URL` to the production domain in Vercel so confirmation
emails consistently return users to the production login page. Supabase allowed
redirect URLs must include the local, production, and preview patterns listed
above.

If a newly signed-up user sees an account-not-ready or email-verification
message in production, check these items first:

1. The user has clicked the Supabase confirmation email before signing in.
2. `NEXT_PUBLIC_SITE_URL` matches the deployed production origin exactly.
3. The same production origin is listed in Supabase Auth **Site URL** and
   **Redirect URLs**.
4. The Confirm signup email template points to `/auth/confirm` as shown above.
5. Production database migrations have been applied, including the account
   provisioning trigger migrations.

If signup shows `SIGNUP_RATE_LIMITED`, inspect both Supabase Auth logs and
Vercel Function logs. LendFolio logs safe signup diagnostics only:
`flow`, `role`, `source`, Supabase error code, HTTP status, sanitized message,
and classified error code. The `source` value identifies whether the rate limit
came from `signUp` or an explicit confirmation `resend` action. LendFolio does
not log email addresses, passwords, cookies, auth tokens, keys, complete form
data, or request headers.

---

## Manager Account Bootstrap

Manager accounts are not self-serve. After deploying to production:

1. Sign up as a borrower or lender (this creates the auth user).
2. In the Supabase dashboard **SQL Editor**, run:

```sql
-- Replace the UUID with the actual auth user ID
UPDATE public.profiles
SET role = 'manager', display_name = 'Platform Manager'
WHERE id = 'your-auth-user-id';
```

3. Sign out and sign back in. The manager workspace will be accessible.

Alternatively, if provisioning events show a failed manager signup, a manager
can use the provisioning repair action to fix it.

---

## School-Demo Verification Checklist

After deploying for a school demo, verify:

- [ ] Homepage loads at the production URL
- [ ] `/signup` allows borrower and lender registration
- [ ] `/login` allows email/password sign-in
- [ ] Password reset email redirects back to the production URL
- [ ] `/borrower` loads the borrower workspace for authenticated borrowers
- [ ] `/lender` loads the lender workspace for authenticated lenders
- [ ] `/manager` loads the manager dashboard for authenticated managers
- [ ] Borrower can save a business profile
- [ ] Borrower can upload verification documents
- [ ] Manager can approve/reject borrower verifications
- [ ] Borrower can submit a loan application
- [ ] Lender can review applications and send offers
- [ ] Borrower can accept/decline offers
- [ ] Active loan and repayment schedule display correctly
- [ ] Repayment proof upload works
- [ ] Lender can verify/reject repayment proofs
- [ ] Notifications appear for workflow events
- [ ] No real credentials visible in page source or repository
- [ ] `main` branch pushes trigger a new deployment

### Device Testing

Test the production URL on:

- Phone 1: device/browser `TBD`, result `TBD`
- Phone 2: device/browser `TBD`, result `TBD`
- Laptop: device/browser `TBD`, result `TBD`

Each device should confirm the homepage is readable, role links are
tappable/clickable, and workspaces fit without horizontal scrolling.

---

## Post-Deployment Smoke Test

1. Visit the production URL.
2. Sign up as a new borrower. Confirm email redirect works (if enabled).
3. Sign in with the new account.
4. Navigate through the borrower workspace.
5. Sign up as a new lender. Confirm the onboarding flow works.
6. Sign in as the manager account.
7. Verify the manager dashboard loads with KPIs.
8. Check that no server errors appear in Vercel **Functions** logs.
9. Check browser console for any client-side errors.

---

## Rollback Notes

### Vercel Rollback

1. Go to Vercel **Deployments**.
2. Find the last known good deployment.
3. Click **⋯ > Promote to Production**.

### Supabase Rollback

Supabase does not have automatic migration rollback. If a migration causes
issues:

1. Manually revert the SQL changes in the Supabase dashboard SQL Editor.
2. Or restore from a Supabase database backup (if backups are enabled).

Before applying migrations to production, test them against a staging project
or local Supabase instance first.

---

## Common Errors and Fixes

### `Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Cause:** Environment variables not set in Vercel.

**Fix:** Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in
Vercel **Settings > Environment Variables** for both Preview and Production.

### Auth email redirects go to `http://localhost:3000`

**Cause:** Supabase Auth Site URL not configured, or `NEXT_PUBLIC_SITE_URL` not
set.

**Fix:** Set the Supabase Auth Site URL to the production Vercel URL. Optionally
set `NEXT_PUBLIC_SITE_URL` in Vercel environment variables.

### `new row violates row-level security policy`

**Cause:** RLS policy blocking the operation. Usually a missing user context or
incorrect role.

**Fix:** Verify the user is authenticated and has the correct role in
`public.profiles`. Check RLS policies in the Supabase dashboard.

### Storage upload fails with `403 Forbidden`

**Cause:** Storage bucket policy blocking the upload.

**Fix:** Verify the storage bucket exists and its RLS policies allow the
authenticated user to upload. Buckets are created through migrations; do not
delete them.

### Build fails with TypeScript errors

**Cause:** Type mismatch or missing dependency.

**Fix:** Run `npm run typecheck` locally to identify the error. Fix the type
issue and redeploy.

### Build fails with lint errors

**Cause:** ESLint errors (warnings do not fail the build).

**Fix:** Run `npm run lint` locally. Fix errors (not warnings) and redeploy.

### `FUNCTION_INVOCATION_TIMEOUT` on Vercel

**Cause:** Server function taking too long, usually a slow Supabase query.

**Fix:** Check Vercel **Functions** logs for the specific route. Optimize the
query or increase the function timeout in `vercel.json` if needed.

### Preview deployments show wrong Supabase data

**Cause:** Preview deployments share the same Supabase project as production.

**Fix:** This is expected for the school demo. For production, consider using
separate Supabase projects for staging and production.

---

## Security Notes

- Never commit real credentials to the repository.
- Never expose Supabase service role keys through `NEXT_PUBLIC_*` variables.
- Keep all storage buckets private.
- RLS must remain enabled on all tables and storage buckets.
- The `.env.example` file contains placeholder values only.
- The `.env.local` file is gitignored and must not be committed.
