# Vercel Deployment Readiness

ADI-7 prepares the Sprint 0 app for deployment on Vercel using the approved Next.js + Supabase + Vercel stack.

## Production/Demo URL

Record the deployed URL after the first successful production deployment:

```text
Production/demo URL: TBD
```

## GitHub to Vercel Setup

1. Push the Sprint 0 branch to GitHub.
2. In Vercel, create a new project and import the GitHub repository.
3. Select the Next.js framework preset.
4. Keep the default build command unless Vercel detects otherwise:
   - Install command: `npm install`
   - Build command: `npm run build`
   - Output directory: Next.js default
5. Confirm the production branch is `main`.
6. Deploy once from the Vercel dashboard.
7. Push a small documentation-only change to `main` later to confirm automatic production deployment works.

## Environment Variables

Configure these variables in Vercel for Preview and Production:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

Use the actual Supabase project URL and anon key from the Supabase dashboard. Do not add a service role key to Vercel for browser-facing code.

## Verification Checklist

After deployment, verify:

- Production build completed successfully in Vercel.
- Homepage loads at the production/demo URL.
- `/borrower` loads and shows the Borrower dashboard shell.
- `/lender` loads and shows the Lender dashboard shell.
- `/manager` loads and shows the Manager dashboard shell.
- No real credentials are visible in the page source or repository.
- Main branch pushes trigger a new deployment.

## Device Checklist

Test the production/demo URL on:

- Phone 1: device/browser `TBD`, result `TBD`
- Phone 2: device/browser `TBD`, result `TBD`
- Laptop: device/browser `TBD`, result `TBD`

Each device should confirm the homepage is readable, role links are tappable/clickable, and dashboard shells fit without horizontal scrolling.

## Sprint Boundaries

Do not add paid infrastructure, custom backend services, real payment integrations, production e-KYC, credit scoring, analytics, or Sprint 1 workflows for this deployment readiness task.
