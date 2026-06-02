# AGENTS.md

## Project

LendFolio is a mobile-first responsive web application for Filipino micro-entrepreneurs, verified lenders, and platform managers.

The main happy path is:

Borrower creates or updates a business profile -> borrower completes required verification and consent steps -> borrower submits a loan application -> approved lender reviews the application -> approved lender sends an offer -> borrower reviews and accepts one offer -> the accepted offer becomes an active loan workflow.

## Product Direction

* Present LendFolio as a simple, credible financing platform.
* Keep user-facing copy concise and product-focused.
* Keep the product UI production-style, not demo-style.
* Do not expose sprint labels, issue IDs, demo-account framing, database setup, migrations, RLS, local fallback behavior, seed data, or implementation notes in normal UI.
* Keep setup, testing, database, and developer details in README or docs, not product surfaces.
* Build requirements-first vertical slices.
* Preserve existing business behavior unless the task explicitly asks to change it.
* Manager pages may remain minimal only where monitoring features are not yet implemented.

## Approved MVP Stack

Use only the approved MVP stack unless explicitly instructed otherwise:

* Next.js App Router
* TypeScript
* Tailwind CSS
* shadcn/ui
* shadcn/ui official generated dependencies when required by added components, such as Radix UI primitives, class-variance-authority, tailwind-merge, clsx, and lucide-react
* Supabase Auth
* Supabase Postgres
* Supabase Row Level Security
* Supabase Storage
* Vercel
* Resend only for selected transactional email
* React Hook Form
* Zod
* Vitest
* Playwright
* GitHub Actions

Do not introduce Hono, Express, Railway, Prisma-first architecture, a separate backend service, native mobile, real payment integration, production e-KYC, AI credit scoring, advanced analytics, or another UI framework unless the project direction changes explicitly.

## shadcn/ui Design System Rules

Use shadcn/ui as the default component system for all product UI.

### Required approach

* Prefer shadcn/ui components from `@/components/ui/*` for common interface primitives.
* Use shadcn/ui primitives for buttons, cards, inputs, labels, textareas, selects, checkboxes, radio groups, tabs, badges, alerts, dialogs, sheets, dropdown menus, tables, skeletons, separators, tooltips, and similar reusable UI elements.
* Do not create one-off hand-styled replacements for UI primitives that already exist in shadcn/ui.
* Plain semantic HTML is still allowed for layout and document structure, including `main`, `section`, `header`, `form`, `nav`, `ul`, `li`, and `div`.
* Tailwind classes may be used for layout, spacing, responsive behavior, and page-specific composition around shadcn/ui components.
* Use `cn()` from `@/lib/utils` for conditional class composition.
* Use lucide-react icons when icons are needed.
* Keep the app mobile-first. All shadcn compositions must work cleanly on small screens before desktop refinements.

### Component organization

* Keep shadcn/ui primitives in `components/ui`.
* Do not fork, duplicate, or feature-specialize shadcn/ui primitives inside feature folders.
* Feature-specific components should live outside `components/ui` and compose shadcn/ui primitives.
* When a needed shadcn/ui component is missing, add it with the shadcn CLI instead of manually recreating it.
* Keep styling consistent with `components.json`: `radix-nova` style, neutral base color, CSS variables, TSX, RSC support, and configured aliases.
* Do not introduce another UI kit or design system for standard product UI.

### Migration expectations

* Preserve existing functionality while migrating UI.
* A shadcn migration must not change business rules, Supabase access rules, validation logic, database behavior, or workflow state transitions.
* Replace custom-styled product UI primitives before changing layout or copy.
* Avoid raw `<button>`, `<input>`, `<textarea>`, `<select>`, custom badges, custom cards, and custom alert banners in product UI when a matching shadcn/ui component exists.
* Use raw HTML controls only when shadcn/ui does not provide the needed primitive or native semantics are materially simpler.
* For forms, combine React Hook Form, Zod, and shadcn/ui form/input primitives.
* Do not perform broad visual redesigns unless requested. Migrate to shadcn first, then improve UX incrementally.

## Current Scope

Implemented or partially implemented:

* Self-serve borrower and lender signup with role selection
* Terms of Service and Privacy Notice consent capture at signup
* Borrower business profile save and load
* Borrower verification lifecycle with required document upload and manager review
* Document Processing Consent before borrower verification uploads
* Credit Review Authorization before loan application submission
* Credit readiness evaluation from business profile data
* Credit limit tracking and enforcement
* Borrower loan application submission with profile and readiness snapshots
* Borrower application editing and withdrawal before acceptance
* Lender application list and application detail review
* Lender offer creation with validation against application and credit state
* Borrower offer review, decline, and acceptance
* Atomic offer acceptance with one accepted offer per application
* Active loan creation from accepted offer
* Repayment schedule creation based on preferred term
* Overdue repayment detection and refresh
* Borrower and lender active loan visibility
* Repayment proof upload to a private Supabase Storage bucket
* Lender repayment proof verification and rejection
* In-app notification system for workflow events
* Profile-based roles and approved-lender access checks
* Observable account provisioning events and manager-only provisioning repair
* Lender signup review profile capture for manual manager verification
* Manager-controlled lender filtering, detail review, approval, and rejection
* Lender verification document upload with required document types and manager review
* Lender approval gating on required accepted documents, profile completeness, and consent
* Lender profile change request workflow with manager approve/reject
* Borrower sensitive profile change detection with automatic verification needs-resubmission
* Manager borrower verification queue with document review, approval, rejection, and resubmission
* Manager operations dashboard for loans, repayment proofs, audit logs, applications, offers, borrower readiness, lender performance, and lookup
* Audit logging for major workflow events
* GitHub Actions CI

Not implemented or not production-ready:

* Real payment processing
* E-wallet integration
* Automated reconciliation
* Credit-limit restoration after loan payoff
* Dispute workflows
* Production e-KYC or automated identity verification
* AI credit scoring
* Advanced manager analytics and reports
* Email notifications through Resend
* Playwright end-to-end coverage
* Vercel production deployment

When a not-yet-implemented area is needed, create a minimal product placeholder or documentation note instead of building beyond the requested scope.

## Business Rules

* A borrower should save a business profile before submitting an application.
* Borrower verification and required consents may gate loan application readiness.
* Loan applications use the current submitted/open flow.
* Approved lenders can review submitted/open applications and send offers.
* Borrowers can accept one pending offer for an application.
* Accepting an offer should close other pending offers for that application.
* Offer acceptance must stay atomic and preserve one accepted offer per application.
* Active loan and repayment workflows must preserve auditability.
* Important workflow transitions must be protected server-side and by database policies where applicable.
* UI checks are advisory. Server actions, RPCs, and database policies are the source of truth.

## Repository Navigation

Use the existing project structure before adding new folders or abstractions:

* `app/` contains App Router pages, layouts, and route-level server actions. Keep route segments organized by user role: borrower, lender, and manager.
* `components/ui/` contains generated shadcn/ui primitives. Treat these as shared primitives, not feature-specific components.
* `components/borrower/`, `components/lender/`, `components/manager/`, `components/layout/`, `components/notifications/`, and `components/legal/` contain composed product UI for their respective surfaces.
* `lib/` contains reusable business logic, Supabase clients, schemas, access-control helpers, workflow helpers, and formatting utilities. Prefer extending existing helpers over duplicating workflow, money, credit, readiness, verification, notification, or status logic.
* `supabase/migrations/` contains database changes. Do not edit old migrations casually; add a new migration when schema or policy changes are required.
* `tests/` contains Vitest coverage. `e2e/` contains Playwright/performance coverage when relevant.
* `docs/` is the right place for setup, demo, database, and implementation notes that should not appear in product UI.

When making a change, update the layer closest to the requirement. For example, copy-only product changes usually belong in route or component files, workflow validation belongs in `lib/` and server-side handlers, and database authorization changes belong in migrations and checked-in Supabase types.

## Change Discipline

* Keep each change small, reviewable, and tied to the requested user outcome.
* Prefer modifying existing files and helpers before introducing new abstractions.
* Do not rename routes, database objects, enum values, storage buckets, or workflow statuses unless the task explicitly requires it.
* Keep borrower, lender, and manager experiences consistent, but do not merge role-specific logic in ways that weaken access control.
* Do not add dependencies for problems already covered by the approved stack or existing utilities.
* When touching loan, offer, repayment, verification, consent, notification, audit, or access-control logic, check both the UI path and the server/database enforcement path.
* Keep documentation changes aligned with the current implementation. Do not document planned features as complete.

## Security and Data Rules

* Never hardcode real credentials, Supabase keys, service role keys, Resend keys, Vercel secrets, or private tokens.
* Use `.env.example` with placeholder values only.
* Do not expose Supabase service role keys to the browser.
* Do not use hardcoded emails for authorization.
* Use `profiles` and `lender_profiles` for role and lender approval decisions.
* Use Supabase RLS for user data in exposed schemas.
* Keep private file access scoped by user role and ownership.
* Do not leak private bucket paths, storage implementation details, SQL errors, or internal exception messages into product UI.
* Keep audit-sensitive workflows append-friendly where evidence history matters.

## Code Style

* Use TypeScript.
* Prefer simple, readable code over clever abstractions.
* Keep components small.
* Use mobile-first responsive layouts.
* Use server components by default where appropriate.
* Use client components only when interactivity requires them.
* Use Zod for validation.
* Use React Hook Form for complex client forms.
* Keep route names clear by role: borrower, lender, manager.
* Preserve existing functionality while improving copy, polish, or structure.
* Keep product copy concise.
* Keep accessibility in mind: labels, focus states, aria attributes where needed, keyboard-accessible controls, and readable contrast.
* Prefer shadcn/ui primitives before custom-styled native controls.
* Use `cn()` for conditional class names.
* Avoid duplicating formatting helpers. Reuse existing money, credit, readiness, verification, and status helpers where available.

## UI and UX Rules

* The UI must be mobile-first.
* Use responsive layouts that scale up cleanly to tablet and desktop.
* Prefer clear hierarchy, concise copy, and visible next actions.
* Keep important borrower/lender/manager workflow states easy to understand.
* Use badges, alerts, and cards consistently through shadcn/ui.
* Keep loading, empty, error, and success states explicit.
* Do not show developer-oriented wording in product surfaces.
* Do not use demo language, placeholder explanations, or implementation details in normal UI.
* Avoid large rewrites when a focused component migration or layout improvement is sufficient.

## Forms and Validation

* Use Zod schemas as the validation source of truth.
* Use React Hook Form for complex interactive forms.
* Use shadcn/ui form primitives for product forms.
* Show field-level errors close to the relevant field.
* Keep submit buttons disabled or pending-state aware during submissions.
* Preserve server-side validation even when client-side validation exists.
* Never rely on client-only checks for authorization, loan workflow transitions, offer acceptance, repayment verification, or verification approval.

## Supabase and Server Rules

* Keep Supabase server access in server actions, server components, or server utilities.
* Do not expose privileged Supabase clients to client components.
* Use existing access-control helpers for borrower, lender, approved lender, and manager areas.
* Keep role checks server-side.
* Preserve RLS assumptions when changing queries.
* Avoid broad schema changes unless explicitly requested.
* If schema changes are required, add migrations and update checked-in types as appropriate.
* Do not change database state machines casually. Preserve application, offer, loan, verification, repayment, and audit transitions.

## Testing and Validation Commands

After changes, run the relevant commands that exist in the repository:

* `npm install` or `npm ci` when dependencies change
* `npm run lint`
* `npm run typecheck`
* `npm run build`
* `npm run test`
* `npm run perf:test` for relevant performance flows
* `npm run perf:report` when performance results need to be summarized
* Playwright tests if present and relevant

If a command does not exist or cannot run in the current environment, report it clearly.

When shadcn/ui components are added, verify any package changes and ensure generated components are committed.

## Completion Format

At the end of every task, report:

* What changed
* Files changed
* Commands run
* Any failures or skipped checks
* What remains for manual setup

## Preferred shadcn/ui Migration Order

When asked to migrate the UI to shadcn/ui, use this order unless instructed otherwise:

1. Add missing shadcn/ui primitives.
2. Migrate shared primitives and navigation surfaces.
3. Migrate login and signup pages.
4. Migrate borrower profile and borrower workspace surfaces.
5. Migrate borrower application, offers, loans, verification, and repayment surfaces.
6. Migrate lender application review and offer creation surfaces.
7. Migrate manager dashboards, queues, detail pages, tables, and review flows.
8. Clean up duplicated custom UI styles after equivalent shadcn/ui composition exists.
9. Run validation commands.

Do not change workflow behavior during UI migration unless the task explicitly asks for it.
