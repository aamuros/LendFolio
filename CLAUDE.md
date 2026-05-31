# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LendFolio is a mobile-first lending platform for Filipino micro-entrepreneurs, built with Next.js 16 App Router, TypeScript, Supabase, and shadcn/ui. Three user roles: borrowers (profile → verification → loan application), lenders (review applications → send offers → verify repayments), and managers (operations dashboard overseeing the full workflow).

## Commands

```bash
npm install              # Install dependencies
npm run dev              # Dev server (port 3000)
npm run dev:turbo        # Dev server with Turbopack
npm run lint             # ESLint
npm run typecheck        # TypeScript type checking
npm run build            # Production build
npm run test             # Vitest (some tests require local Supabase)
npm run perf:test        # Playwright performance tests
```

Full validation sequence (mirrors CI):
```bash
supabase start && supabase db reset
npm run lint && npm run typecheck && npm run test && npm run build
```

## Architecture

**App Router structure** — `app/` contains pages, layouts, and server actions organized by role:
- `/borrower/` — borrower workspace (profile, verification, applications, offers, loans)
- `/lender/` — lender workspace (onboarding, application review, offers)
- `/manager/` — operations dashboard (verifications, lenders, loans, repayments, audit logs, lookup)
- Public routes: `/`, `/signup`, `/login`, `/forgot-password`, `/reset-password`, `/terms`, `/privacy`

**Component layer** — `components/ui/` holds 29 shadcn/ui primitives. Feature components in `components/` compose these primitives. Never fork or duplicate shadcn/ui components into feature folders.

**Business logic** — `lib/` contains Supabase clients, access-control helpers, validation, and workflow logic. Key modules: `access-control.ts`, `borrower-readiness.ts`, `credit-limits.ts`, `manager-operations.ts`, `active-loans.ts`, `notifications.ts`.

**Database** — Supabase Postgres with Row Level Security. 41 SQL migrations in `supabase/migrations/`. Seed data in `supabase/seed.sql`. Checked-in types in `lib/supabase/types.ts`. Two Supabase clients: `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (server actions/components).

**Forms** — React Hook Form + Zod + shadcn/ui form primitives. Zod schemas are the validation source of truth. Server-side validation is always required even when client-side validation exists.

## Key Conventions

**Server vs Client components** — Default to server components. Use client components only when interactivity (forms, event handlers, hooks) requires them.

**UI** — All product UI uses shadcn/ui primitives from `@/components/ui/*`. Use `cn()` from `@/lib/utils` for conditional class composition. Use lucide-react for icons. Mobile-first responsive design is required. Never use raw `<button>`, `<input>`, `<select>` etc. when a shadcn/ui equivalent exists.

**Adding shadcn/ui components** — Use the CLI: `npx shadcn@latest add <component>`. Do not manually recreate primitives.

**Security** — Never expose Supabase service role keys to the browser. Role checks happen server-side using `profiles` and `lender_profiles` tables. RLS policies enforce data access. UI checks are advisory only; server actions, RPCs, and database policies are the source of truth.

**Migrations** — After schema changes, add a migration in `supabase/migrations/` and update `lib/supabase/types.ts`. Do not change database state machines (application/offer/loan/repayment/verification transitions) without explicit instruction.

**Environment** — Requires `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Copy from `.env.example`. Service role keys must never be in `NEXT_PUBLIC_*` variables.

## Business Rules

- Loan applications are gated by: active profile, approved verification, accepted consents (ToS, Privacy, Credit Review Authorization), and credit limit not exceeded.
- Offer acceptance is atomic — one accepted offer per application; other pending offers are closed.
- UI checks are advisory. Server actions, RPCs, and database policies are the authoritative source for workflow transitions.
- Application deletion is intentionally absent; closed/withdrawn applications remain for audit history.
- Product UI uses production-style copy only — no sprint labels, demo language, implementation details, or database internals.

## Testing

- **Unit/integration**: Vitest 4, tests in `tests/`. Database integration tests (`supabase-local.test.ts`) require local Supabase running via `supabase start && supabase db reset`.
- **Performance**: Playwright in `e2e/`, run with `npm run perf:test`.
- Tests that touch Supabase need exported environment variables from the local instance (see `docs/foundation-verification.md`).

## CI Pipeline

GitHub Actions (`.github/workflows/ci.yml`) runs on every push/PR: checkout → `npm ci` → `supabase start` + `supabase db reset` → lint → typecheck → test → build.
