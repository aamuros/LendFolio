# LendFolio

LendFolio is a mobile-first web application for Filipino micro-entrepreneurs,
verified lenders, and platform managers.

The current implementation supports the first requirements-first vertical slice:
borrowers maintain a business profile, submit a loan application, approved
lenders review open applications and send offers, and borrowers accept one
offer. Borrowers can edit or withdraw submitted/open applications before
acceptance, and can decline pending offers without withdrawing the application.

Manager monitoring is represented by a minimal dashboard shell only.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui readiness
- Supabase Auth, Postgres, and Row Level Security
- React Hook Form
- Zod
- Vitest

Vercel, Supabase Storage, Resend, Playwright, and GitHub Actions remain part of
the approved MVP stack and should be introduced only when needed by a scoped
task.

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file from the placeholder example:

```bash
cp .env.example .env.local
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

`.env.example` contains placeholder public variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Do not commit real secrets. Do not expose Supabase service role keys through
`NEXT_PUBLIC_*`.

## Current Scope

Implemented:

- Borrower business profile save and load
- Borrower loan application submission
- Borrower application editing and withdrawal before acceptance
- Lender application list and detail review
- Lender offer creation
- Borrower offer review, decline, and acceptance
- Profile-based roles and approved-lender access checks
- Atomic offer acceptance with audit logging
- Minimal manager page

Not implemented:

- Active loan records
- Repayment schedules or repayment proof uploads
- Identity verification
- Credit scoring
- Manager reports
- Audit log views
- Real payment integrations

Application deletion is intentionally not part of the borrower workflow. Closed
or withdrawn applications remain available for audit history. Active loans,
repayments, repayment proof uploads, and payment flows remain deferred.

The product UI uses production-style copy. Setup, test, and database details
belong in docs, not product surfaces.

## Database Setup

Supabase setup and schema notes live in:

- `docs/supabase-setup.md`
- `docs/foundation-verification.md`
- `docs/application-offer-state-machine.md`
- `docs/database-schema-plan.md`
- `docs/storage-buckets-plan.md`
- `docs/rls-plan.md`
- `docs/schema-draft.sql`

Apply migrations before testing database-backed profile saves, application
submissions, lender offers, and borrower offer acceptance:

```bash
supabase migration up
```

For a repeatable clean local verification run, use:

```bash
supabase start
supabase db reset
npm run test
```

The database integration tests run when local Supabase test environment
variables are set; see `docs/foundation-verification.md` for the exact command.

## Manual Test Flow

1. Create Supabase Auth users and matching `profiles` rows.
2. Create an approved `lender_profiles` row for the lender user.
3. Sign in as a borrower.
4. Open `/borrower`, save the business profile, and submit a loan application.
5. Optionally edit or withdraw the application while it is still submitted/open.
6. Sign out.
7. Sign in as the approved lender.
8. Open `/lender/applications`, open the submitted application, and send an offer.
9. Sign out.
10. Sign in again as the borrower.
11. Open `/borrower`, confirm the offer appears, then decline or accept it.

For additional manual QA checks, see `docs/sprint-1-validation.md`.

## Validation

```bash
npm run lint
npm run typecheck
npm run build
npm run test
```

## shadcn/ui

The project includes `components.json`, Tailwind CSS, import aliases, and
`lib/utils.ts` so shadcn/ui components can be added when needed.

Example:

```bash
npx shadcn@latest add button
```
