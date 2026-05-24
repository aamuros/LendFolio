# AGENTS.md

## Project

This repository is for LendFolio — Agile MVP Build.

LendFolio is a mobile-first responsive web MVP for Filipino micro-entrepreneurs, verified lenders, and platform managers. The MVP must prove the first defendable workflow:

Borrower creates portfolio → borrower submits loan application → lender reviews application → lender sends official offer → borrower accepts offer → accepted offer becomes active loan → borrower uploads repayment proof → lender verifies repayment → platform manager monitors activity and audit logs.

## Approved MVP stack

Use only the approved Sprint 0/MVP stack unless explicitly instructed otherwise:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Auth
- Supabase Postgres
- Supabase Row Level Security
- Supabase Storage
- Vercel
- Resend only for selected transactional email later
- React Hook Form
- Zod
- Vitest
- Playwright
- GitHub Actions

Do not introduce Hono, Express, Railway, Prisma-first architecture, a separate backend service, native mobile, real payment integration, production e-KYC, AI credit scoring, or advanced analytics during Sprint 0.

## Sprint 1 objective

Build the first visible happy path: borrower submits one loan application, lender views it and sends an offer, borrower reviews and accepts the offer. Avoid advanced validation and reports in this sprint.

## Scope control

Do not build Sprint 1 features yet. Do not implement borrower portfolio forms, real loan application submission, lender offer creation, offer acceptance, active loans, repayment proof upload, credit scoring, manager reports, or audit logs unless the current task explicitly asks for a placeholder shell.

When in doubt, create a documented placeholder and explain what later sprint should implement it.

## Security and data rules

- Never hardcode real credentials, Supabase keys, service role keys, Resend keys, or Vercel secrets.
- Use `.env.example` with placeholder values only.
- Do not expose Supabase service role keys to the browser.
- Assume important business rules must eventually run server-side and/or be protected with Supabase RLS.
- For Sprint 0, document RLS expectations even if full policies are not yet implemented.

## Code style

- Use TypeScript.
- Prefer simple, readable code over clever abstractions.
- Keep components small.
- Use mobile-first responsive layouts.
- Use server components by default where appropriate.
- Use client components only when interactivity requires them.
- Use Zod for validation scaffolding where forms are introduced later.
- Keep route names clear by role: borrower, lender, manager.

## Validation commands

After changes, run the relevant commands that exist in the repository:

- package install command
- lint
- typecheck
- build
- unit tests if present
- Playwright tests if present

If a command does not exist yet, either add the appropriate script or explain why it is not available.

## Completion format

At the end of every task, report:

- What changed
- Files changed
- Commands run
- Any failures or skipped checks
- What remains for manual setup