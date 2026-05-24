# LendFolio

LendFolio is a mobile-first responsive web MVP for Filipino micro-entrepreneurs, verified lenders, and platform managers.

This repository includes the Sprint 0 foundation and the Sprint 1 happy path:
borrower portfolio, borrower loan application submission, lender application
review, lender official offer creation, and borrower offer acceptance. It does
not include active loans, repayments, credit scoring, manager reports, or audit
logs yet.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui readiness
- Supabase client readiness
- React Hook Form + Zod
- Vitest

Vercel, Playwright, and GitHub Actions are part of the approved MVP stack, but their full integration is planned in separate Sprint 0 issues.

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

## Validation

```bash
npm run lint
npm run typecheck
npm run build
npm run test
```

## shadcn/ui

The project includes `components.json`, Tailwind CSS, import aliases, and `lib/utils.ts` so shadcn/ui components can be added later.

When a Sprint 0 or later task needs a component, run:

```bash
npx shadcn@latest add button
```

Only add components that are needed by the current sprint scope.

## Environment Variables

`.env.example` contains placeholder public Supabase variables only:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Do not commit real secrets. Do not expose Supabase service role keys through `NEXT_PUBLIC_*`.

## Supabase Planning

Sprint 0 Supabase setup notes live in:

- `docs/supabase-setup.md`
- `docs/database-schema-plan.md`
- `docs/storage-buckets-plan.md`
- `docs/rls-plan.md`
- `docs/schema-draft.sql`
- `docs/demo-accounts.md`

The SQL file is a planning draft, not an applied migration.

## Vercel Deployment

Deployment readiness steps live in `docs/vercel-deployment.md`.

Production/demo URL placeholder:

```text
TBD
```

Before marking deployment complete, connect the GitHub repository to Vercel, set the Supabase public environment variables in Vercel, verify `main` auto-deploys, and test the deployed app on two phones and one laptop.

## Demo Supabase Sign-In

The homepage links to `/login` for Supabase-backed demo testing:

- Borrower: `/login?role=borrower`
- Lender: `/login?role=lender`
- Manager: `/login?role=manager`

Create the demo users manually in Supabase Auth before testing:

- `borrower.demo@example.com`
- `lender.demo@example.com`
- `manager.demo@example.com`

No demo passwords are committed. Set passwords manually in Supabase and share
them outside the repository.

## Sprint 1 Happy Path

The borrower route at `/borrower` contains the Sprint 1 portfolio MVP form for
business type, location, monthly gross revenue, monthly expenses, existing loan
payments, years in operation, and loan purpose context.

After a portfolio is saved, the same route allows one borrower-side loan
application submission with requested amount, purpose, preferred term, and
remarks. Submitted applications appear below the form after refresh and are
stored in `public.loan_applications` when Supabase Auth, migrations, and RLS are
configured.

The forms save temporary device-local drafts in the browser for the current demo
shell. They also call server actions prepared to write into Supabase when the
borrower is authenticated.

The lender route at `/lender/applications` lists submitted/open applications.
Opening an application shows the borrower business and financial context needed
for Sprint 1 review, plus an official offer form. Borrowers can review offers
grouped under each source application and accept one pending offer. The accepted
offer remains an offer record; active loan creation is deferred.

Apply the Sprint 1 migrations before testing Supabase-backed portfolio saves,
loan application submissions, lender offers, and borrower offer acceptance:

```bash
supabase migration up
```

Manual Supabase test flow:

1. Sign in at `/login?role=borrower`.
2. Open `/borrower`, save the borrower portfolio, and submit one loan application.
3. Sign out.
4. Sign in at `/login?role=lender`.
5. Open `/lender/applications`, open the submitted application, and send an offer.
6. Sign out.
7. Sign in again at `/login?role=borrower`.
8. Open `/borrower`, confirm the offer appears, and accept it.

PR verification checklist:

- [ ] Created demo users manually in Supabase Auth.
- [ ] Applied migrations with `supabase migration up`.
- [ ] Borrower can sign in.
- [ ] Borrower can save portfolio to Supabase.
- [ ] Borrower can submit loan application to Supabase.
- [ ] Lender can sign in.
- [ ] Lender can see submitted/open applications.
- [ ] Lender can open application detail.
- [ ] Lender can send pending offer.
- [ ] Borrower can see offer.
- [ ] Borrower can accept offer.
- [ ] Other pending offers are declined.
- [ ] Sign-out works.
- [ ] No passwords or service role keys committed.

Sprint 1 workflow state is intentionally simple: applications use submitted/open
only, and offers use pending/accepted/declined. Document uploads, identity
verification, credit-limit calculation, active loans, repayments, manager
reports, and audit logs remain deferred.
