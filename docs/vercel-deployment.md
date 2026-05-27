# Vercel Deployment Readiness

This document describes the steps required to deploy LendFolio to Vercel using
the approved Next.js + Supabase + Vercel stack.

## Production URL

Record the deployed URL after the first successful production deployment:

```text
Production URL: TBD
```

## GitHub to Vercel Setup

1. Push the repository to GitHub.
2. In Vercel, create a new project and import the GitHub repository.
3. Select the Next.js framework preset.
4. Keep the default build command unless Vercel detects otherwise:
   - Install command: `npm install`
   - Build command: `npm run build`
   - Output directory: Next.js default
5. Confirm the production branch is `main`.
6. Deploy once from the Vercel dashboard.
7. Push a small change to `main` to confirm automatic production deployment
   works.

## Environment Variables

Configure these variables in Vercel for Preview and Production:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

Use the actual Supabase project URL and anon key from the Supabase dashboard. Do
not add a service role key to Vercel for browser-facing code.

## Verification Checklist

After deployment, verify:

- Production build completed successfully in Vercel.
- Homepage loads at the production URL.
- `/signup` allows borrower and lender registration.
- `/login` allows email/password sign-in.
- `/borrower` loads the borrower workspace for authenticated borrowers.
- `/lender` loads the lender workspace for authenticated lenders.
- `/manager` loads the manager dashboard for authenticated managers.
- No real credentials are visible in the page source or repository.
- Main branch pushes trigger a new deployment.

## Device Checklist

Test the production URL on:

- Phone 1: device/browser `TBD`, result `TBD`
- Phone 2: device/browser `TBD`, result `TBD`
- Laptop: device/browser `TBD`, result `TBD`

Each device should confirm the homepage is readable, role links are
tappable/clickable, and workspaces fit without horizontal scrolling.
