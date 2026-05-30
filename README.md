# LendFolio

LendFolio is a mobile-first responsive web application for Filipino
micro-entrepreneurs, verified lenders, and platform managers.

Borrowers maintain a business profile, complete identity verification, and
submit loan applications. Approved lenders review open applications and send
structured offers. Borrowers compare, decline, or accept one offer per
application. Acceptance creates an active loan with a repayment schedule based
on the preferred term. Borrowers upload repayment proof for due installments,
and approved lenders verify or reject submitted proof. Managers oversee the
platform through an operations dashboard covering loans, repayments,
applications, offers, audit events, borrower verifications, lender review, and
user lookup.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 App Router |
| Language | TypeScript 5.9 |
| Styling | Tailwind CSS 4 |
| Components | shadcn/ui readiness (`components.json`, `lib/utils.ts`) |
| Auth | Supabase Auth (email/password) |
| Database | Supabase Postgres with Row Level Security |
| Storage | Supabase Storage (private buckets) |
| Forms | React Hook Form 7 + Zod 4 |
| Testing | Vitest 4 |
| CI | GitHub Actions |
| Hosting | Vercel (approved, not yet active) |
| Email | Resend (approved, not yet active) |
| E2E Testing | Playwright (approved, not yet active) |

## Project Structure

```text
app/
├── page.tsx                     # Landing page
├── layout.tsx                   # Root layout
├── globals.css                  # Global styles
├── signup/                      # Self-serve borrower and lender registration
├── login/                       # Email/password sign-in
├── forgot-password/             # Password reset request
├── reset-password/              # Password reset confirmation
├── borrower/                    # Borrower workspace (profile, applications, offers, loans)
├── lender/                      # Lender workspace
│   ├── onboarding/              # Lender profile onboarding
│   ├── register/                # Lender registration
│   └── applications/            # Application list and detail review
│       └── [id]/                # Single application detail and offer form
├── manager/                     # Manager operations dashboard
│   ├── applications/            # Application monitoring
│   │   └── [id]/                # Application detail
│   ├── audit-logs/              # Audit event log
│   │   └── [id]/                # Audit event detail
│   ├── borrower-verifications/  # Borrower verification queue
│   ├── lenders/                 # Lender review queue
│   │   └── [id]/                # Lender detail, approval, rejection
│   ├── loans/                   # Active loan monitoring
│   │   └── [id]/                # Loan detail
│   ├── lookup/                  # Borrower record lookup
│   ├── notifications/           # Notification actions
│   ├── repayments/              # Repayment proof monitoring
│   │   └── [id]/                # Repayment detail
│   └── users/                   # User lookup
│       └── [id]/                # User detail
├── consents/                    # Consent recording actions
├── notifications/               # Notification actions
├── terms/                       # Terms of Service page
└── privacy/                     # Privacy Notice page

components/                      # Shared UI components
lib/                             # Business logic, Supabase clients, validation
├── supabase/
│   ├── client.ts                # Browser Supabase client
│   ├── server.ts                # Server-side Supabase client
│   └── types.ts                 # Checked-in database types
└── validation/                  # Input validation helpers

docs/                            # Design documents and setup guides
supabase/
├── migrations/                  # 34 applied SQL migrations
├── seed.sql                     # Local demo data
└── config.toml                  # Supabase local config
tests/                           # Vitest test suite (unit + database integration)
.github/workflows/ci.yml        # CI pipeline
```

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

### Implemented

- Self-serve borrower and lender signup with role selection
- Terms of Service and Privacy Notice consent capture at signup
- Borrower business profile save and load
- Borrower verification lifecycle with required document upload, manager review,
  and application-readiness gating
- Document Processing Consent before borrower verification uploads
- Credit Review Authorization before loan application submission
- Credit readiness evaluation from business profile data
- Credit limit tracking and enforcement
- Borrower loan application submission with profile and readiness snapshots
- Borrower application editing and withdrawal before acceptance
- Lender application list and detail review
- Lender offer creation with validation against application and credit state
- Borrower offer review, decline, and acceptance
- Atomic offer acceptance (one accepted offer per application)
- Active loan creation from accepted offer
- Repayment schedule creation based on preferred term (1, 3, 6, or 12
  installments)
- Overdue repayment detection and refresh
- Borrower and lender active loan visibility
- Repayment proof upload to a private Supabase Storage bucket
- Lender repayment proof verification and rejection
- Outstanding balance reduction after proof verification
- In-app notification system for workflow events
- Profile-based roles and approved-lender access checks
- Observable account provisioning events and manager-only provisioning repair
- Lender signup review profile capture for manual manager verification
- Manager-controlled lender filtering, detail review, approval, and rejection
- Manager borrower verification queue with document review, approval, rejection,
  and resubmission
- Manager operations dashboard for loans, repayment proofs, audit logs,
  applications, offers, borrower readiness, lender performance, and lookup
- Audit logging for major workflow events
- GitHub Actions CI (lint, typecheck, test, build with Supabase)

### Not Implemented

- Real payment processing
- E-wallet integration
- Automated reconciliation
- Credit-limit restoration after loan payoff
- Dispute workflows
- Production e-KYC or automated identity verification
- Credit scoring
- Manager reports and analytics
- Email notifications (Resend approved but not wired)
- Playwright end-to-end tests
- Vercel production deployment

Application deletion is intentionally not part of the borrower workflow. Closed
or withdrawn applications remain available for audit history. Repayment proof
upload and lender review are implemented as a prototype-safe evidence workflow;
the app does not process real payments.

The product UI uses production-style copy. Setup, test, and database details
belong in docs, not product surfaces.

## Database Setup

Supabase setup and design documents:

| Document | Purpose |
| --- | --- |
| [supabase-setup.md](docs/supabase-setup.md) | Supabase project and auth configuration |
| [application-offer-state-machine.md](docs/application-offer-state-machine.md) | Application, offer, loan, and repayment state transitions |
| [rls-plan.md](docs/rls-plan.md) | Row Level Security policy design |
| [storage-buckets-plan.md](docs/storage-buckets-plan.md) | Private Storage bucket design |
| [borrower-credit-readiness.md](docs/borrower-credit-readiness.md) | Profile-based credit readiness evaluation |
| [foundation-verification.md](docs/foundation-verification.md) | Local database integration test setup |
| [demo-accounts.md](docs/demo-accounts.md) | Seeded local test accounts and QA flow |
| [sprint-1-validation.md](docs/sprint-1-validation.md) | Manual QA checklist |
| [vercel-deployment.md](docs/vercel-deployment.md) | Vercel deployment readiness |

Apply migrations before testing database-backed features:

```bash
supabase migration up
```

For a repeatable clean local run:

```bash
supabase start
supabase db reset
npm run test
```

The database integration tests run when local Supabase test environment
variables are set; see [foundation-verification.md](docs/foundation-verification.md)
for the exact commands.

## Borrower Verification And Readiness

Borrower application submission is gated by `submit_loan_application` and the
loan application insert policy. UI checks are advisory; database RPCs are the
source of truth.

### Verification States

| State | Meaning |
| --- | --- |
| `not_started` | No verification record exists |
| `pending_documents` | Verification created, documents not yet uploaded |
| `submitted` | Documents uploaded, awaiting manager review |
| `under_review` | Manager has started reviewing |
| `approved` | Verification approved by manager |
| `rejected` | Verification rejected by manager |
| `needs_resubmission` | Manager requested corrected documents |

The legacy `pending` value can still exist for older rows and is treated like
`pending_documents`.

### Required Documents

Required borrower verification documents (centralized in TypeScript and SQL):

- `valid_id`
- `business_proof`

`address_proof`, `business_registration`, and `other` remain supported document
types but are not required by the current product policy.

### Application Readiness Gates

A borrower is application-ready only when all of these are true:

- Business profile exists and required fields are complete
- Account profile is active and not suspended
- Current Terms of Service, Privacy Notice, and Credit Review Authorization are
  accepted
- Borrower verification is approved
- Required verification document types are accepted

Borrower document upload also requires current Terms of Service, Privacy Notice,
and Document Processing Consent. Uploads are limited server-side to JPG, PNG,
WebP, or PDF files up to 5 MB and must use the private
`borrower-verification-documents` bucket under the borrower-scoped
`borrowers/{borrower_id}/verification/{verification_id}/...` path.

### Manager Verification Review

Manager review is queue-based at `/manager/borrower-verifications`. Managers can
filter verification records, inspect consent status and document history, accept
or reject individual documents, approve complete verifications, reject with a
borrower-facing reason, or mark a verification as needing resubmission. Approval
is rejected by the RPC while required documents are missing or not accepted.
Accepted documents remain immutable evidence; newer uploads create additional
history instead of deleting prior rejected/submitted records.

### Readiness Failure Codes

Readiness failures return structured codes:

- `profile_required`
- `profile_incomplete`
- `profile_needs_review`
- `profile_stale`
- `borrower_verification_required`
- `documents_required`
- `consent_required`
- `credit_limit_exceeded`
- `account_not_active`
- `suspended`
- `not_eligible`

## Route Map

| Route | Role | Purpose |
| --- | --- | --- |
| `/` | Public | Landing page |
| `/signup` | Public | Self-serve borrower and lender registration |
| `/login` | Public | Email/password sign-in |
| `/forgot-password` | Public | Password reset request |
| `/reset-password` | Public | Password reset confirmation |
| `/terms` | Public | Terms of Service |
| `/privacy` | Public | Privacy Notice |
| `/notifications` | Authenticated | Notification actions |
| `/borrower` | Borrower | Workspace: profile, verification, applications, offers, loans |
| `/lender` | Lender | Workspace: overview and navigation |
| `/lender/onboarding` | Lender | Lender profile onboarding |
| `/lender/register` | Lender | Lender registration |
| `/lender/applications` | Lender | Submitted application list |
| `/lender/applications/[id]` | Lender | Application detail and offer form |
| `/manager` | Manager | Operations dashboard |
| `/manager/applications` | Manager | Application monitoring |
| `/manager/applications/[id]` | Manager | Application detail |
| `/manager/audit-logs` | Manager | Audit event log |
| `/manager/audit-logs/[id]` | Manager | Audit event detail |
| `/manager/borrower-verifications` | Manager | Borrower verification queue |
| `/manager/lenders` | Manager | Lender review queue |
| `/manager/lenders/[id]` | Manager | Lender detail, approval, rejection |
| `/manager/loans` | Manager | Active loan monitoring |
| `/manager/loans/[id]` | Manager | Loan detail |
| `/manager/lookup` | Manager | Borrower record lookup |
| `/manager/repayments` | Manager | Repayment proof monitoring |
| `/manager/repayments/[id]` | Manager | Repayment detail |
| `/manager/notifications` | Manager | Notification actions |
| `/manager/users/[id]` | Manager | User detail |

## Manual Test Flow

1. Open `/signup`, create a borrower account, then continue to `/borrower`
   when local Supabase returns an active session.
2. Save the borrower business profile.
3. Accept the borrower document-upload disclosures, then upload a valid ID and
   business proof.
4. Sign in as a seeded manager account, open
   `/manager/borrower-verifications`, accept the required documents, then
   approve the borrower verification.
5. Sign back in as the borrower, accept the loan application disclosures, and
   submit a loan application.
6. Optionally edit or withdraw the application while it is still submitted/open.
7. Sign out.
8. Open `/signup` and create a lender account with the lender review profile
   fields.
9. Confirm the lender sees pending-review messaging and cannot access lender
   application review yet.
10. Sign in as a seeded manager account.
11. Open `/manager/lenders`, filter pending lenders if needed, open the lender
    detail page, then approve the pending lender or reject with a reason.
12. Sign out, then sign in as the approved lender.
13. Open `/lender/applications`, open the submitted application, and send an
    offer.
14. Sign out.
15. Sign in again as the borrower.
16. Open `/borrower`, confirm the offer appears, then decline or accept it.
17. After acceptance, confirm the borrower sees an active loan with principal,
    repayment amount, outstanding balance, due date, and installment details.
18. Upload a repayment proof file for the due installment.
19. Sign in as the lender and confirm the accepted offer still has application
    context plus active-loan context.
20. Review the submitted proof and verify or reject it.
21. If verified, confirm the installment is verified and outstanding balance is
    reduced.
22. Sign in as the manager and confirm the dashboard links to active loans,
    repayment proofs, audit logs, applications and offers, lender review,
    borrower verifications, and lookup.
23. Confirm there is no real payment processing, e-wallet integration, automated
    reconciliation, credit-limit restoration, dispute workflow, or email
    notification workflow.

Manager accounts remain manually seeded or provisioned. Borrower and lender
accounts should use self-serve signup. Lender approval is a manual manager
review of the submitted lender profile, not automated identity verification.
Email notifications are still not implemented.

For additional manual QA checks, see
[sprint-1-validation.md](docs/sprint-1-validation.md).

## CI Pipeline

The GitHub Actions CI workflow (`.github/workflows/ci.yml`) runs on every push
and pull request:

1. Checkout and install dependencies (`npm ci`)
2. Start local Supabase and reset the database
3. Export Supabase test environment variables
4. Lint (`npm run lint`)
5. Typecheck (`npm run typecheck`)
6. Test (`npm run test`)
7. Build (`npm run build`)

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
