# AGENTS.md

## Project

LendFolio is a mobile-first responsive web application for Filipino
micro-entrepreneurs, verified lenders, and platform managers.

The implemented happy path is:

Borrower creates or updates a business profile -> borrower submits a loan
application -> approved lender reviews the application -> approved lender sends
an offer -> borrower reviews and accepts one offer.

## Product Direction

- Present LendFolio as a simple, credible financing platform.
- Keep user-facing copy concise and product-focused.
- Do not expose sprint labels, issue IDs, demo-account framing, database setup,
  migrations, RLS, local fallback behavior, or implementation notes in normal UI.
- Keep setup and testing details in README or docs, not product surfaces.
- Build requirements-first vertical slices and keep product UI production-style.
- Manager pages may be minimal until monitoring features are implemented.

## Approved MVP Stack

Use only the approved MVP stack unless explicitly instructed otherwise:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Auth
- Supabase Postgres
- Supabase Row Level Security
- Supabase Storage
- Vercel
- Resend only for selected transactional email
- React Hook Form
- Zod
- Vitest
- Playwright
- GitHub Actions

Do not introduce Hono, Express, Railway, Prisma-first architecture, a separate
backend service, native mobile, real payment integration, production e-KYC, AI
credit scoring, or advanced analytics unless the project direction changes
explicitly.

## Current Scope

Implemented:

- Borrower business profile save and load
- Borrower loan application submission
- Lender application list and application detail review
- Lender offer creation
- Borrower offer review and acceptance
- Profile-based roles with approved lender verification
- Supabase RLS policies for borrower, lender, and manager data access
- Audit logging for the existing workflow
- Minimal manager dashboard placeholder

Not implemented:

- Active loan records
- Repayment schedules or repayment proof upload
- Identity verification
- Credit scoring
- Manager reporting
- Audit log views
- Real payment integrations

When a not-yet-implemented area is needed, create a minimal product placeholder
or documentation note instead of building beyond the requested scope.

## Business Rules

- A borrower should save a business profile before submitting an application.
- Loan applications use the current submitted/open flow.
- Approved lenders can review submitted/open applications and send offers.
- Borrowers can accept one pending offer for an application.
- Accepting an offer should close other pending offers for that application.
- Offer acceptance must stay atomic and preserve one accepted offer per
  application.
- Important workflow transitions must be protected server-side and by database
  policies where applicable.

## Security and Data Rules

- Never hardcode real credentials, Supabase keys, service role keys, Resend keys,
  or Vercel secrets.
- Use `.env.example` with placeholder values only.
- Do not expose Supabase service role keys to the browser.
- Do not use hardcoded emails for authorization. Use `profiles` and
  `lender_profiles` for role and lender approval decisions.
- Use Supabase RLS for user data in exposed schemas.

## Code Style

- Use TypeScript.
- Prefer simple, readable code over clever abstractions.
- Keep components small.
- Use mobile-first responsive layouts.
- Use server components by default where appropriate.
- Use client components only when interactivity requires them.
- Use Zod for validation.
- Keep route names clear by role: borrower, lender, manager.
- Preserve existing functionality while improving copy, polish, or structure.

## Validation Commands

After changes, run the relevant commands that exist in the repository:

- `npm install` when dependencies change
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test`
- Playwright tests if present and relevant

If a command does not exist or cannot run in the current environment, report it
clearly.

## Completion Format

At the end of every task, report:

- What changed
- Files changed
- Commands run
- Any failures or skipped checks
- What remains for manual setup
