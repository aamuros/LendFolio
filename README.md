# LendFolio

LendFolio is a mobile-first web application for Filipino micro-entrepreneurs,
verified lenders, and platform managers.

The current implementation supports the first requirements-first vertical slice:
borrowers maintain a business profile, submit a loan application, approved
lenders review open applications and send offers, and borrowers accept one
offer. Borrowers can edit or withdraw submitted/open applications before
acceptance, decline pending offers without withdrawing the application, and see
the active loan and repayment schedule created from the accepted offer.
Borrowers can upload repayment proof for a due installment, and approved lenders
can verify or reject submitted proof.

Managers can monitor operational activity across loans, repayment proofs,
applications, offers, audit events, and borrower lookup.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui readiness
- Supabase Auth, Postgres, and Row Level Security
- React Hook Form
- Zod
- Vitest

Vercel, Resend, Playwright, and GitHub Actions remain part of the approved MVP
stack and should be introduced only when needed by a scoped task.

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
- Borrower verification lifecycle with required document upload, manager review,
  and application-readiness gating
- Borrower loan application submission
- Borrower application editing and withdrawal before acceptance
- Lender application list and detail review
- Lender offer creation
- Borrower offer review, decline, and acceptance
- Atomic offer acceptance
- Active loan creation from accepted offer
- Repayment schedule creation based on preferred term: 1, 3, 6, or 12 installments
- Borrower and lender active loan visibility
- Repayment proof upload to a private Supabase Storage bucket
- Submitted proof state
- Lender repayment proof verification and rejection
- Outstanding balance reduction after proof verification
- Self-serve borrower and lender signup
- Terms of Service and Privacy Notice consent capture at signup
- Document Processing Consent before borrower verification uploads
- Credit Review Authorization before loan application submission
- Profile-based roles and approved-lender access checks
- Observable account provisioning events and manager-only provisioning repair
- Lender signup review profile capture for manual manager verification
- Manager-controlled lender filtering, detail review, approval, and rejection
- Manager operations dashboard for loans, repayment proofs, audit logs,
  applications, offers, lender review, and lookup
- Audit logging for major workflow events

Not implemented:

- Real payment processing
- E-wallet integration
- Automated reconciliation
- Credit-limit restoration
- Dispute workflows
- Production e-KYC or automated identity verification
- Credit scoring
- Manager reports
- Email notifications

Application deletion is intentionally not part of the borrower workflow. Closed
or withdrawn applications remain available for audit history. Repayment proof
upload and lender review are implemented as a prototype-safe evidence workflow;
the app still does not process real payments.

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
submissions, lender offers, borrower offer acceptance, and repayment proof
review:

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

## Borrower Verification And Readiness

Borrower application submission is gated by `submit_loan_application` and the
loan application insert policy. UI checks are advisory; database RPCs are the
source of truth.

Borrower verification states are:

- `not_started`
- `pending_documents`
- `submitted`
- `under_review`
- `approved`
- `rejected`
- `needs_resubmission`

The legacy `pending` value can still exist for older rows and is treated like
`pending_documents`.

Required borrower verification documents are centralized in TypeScript and SQL:

- `valid_id`
- `business_proof`

`address_proof`, `business_registration`, and `other` remain supported document
types but are not required by the current product policy.

A borrower is application-ready only when all of these are true:

- business profile exists and required fields are complete
- account profile is active and not suspended
- current Terms of Service, Privacy Notice, and Credit Review Authorization are
  accepted
- borrower verification is approved
- required verification document types are accepted

Borrower document upload also requires current Terms of Service, Privacy Notice,
and Document Processing Consent. Uploads are limited server-side to JPG, PNG,
WebP, or PDF files up to 5 MB and must use the private
`borrower-verification-documents` bucket under the borrower-scoped
`borrowers/{borrower_id}/verification/{verification_id}/...` path.

Manager review is queue-based at `/manager/borrower-verifications`. Managers can
filter verification records, inspect consent status and document history, accept
or reject individual documents, approve complete verifications, reject with a
borrower-facing reason, or mark a verification as needing resubmission. Approval
is rejected by the RPC while required documents are missing or not accepted.
Accepted documents remain immutable evidence; newer uploads create additional
history instead of deleting prior rejected/submitted records.

Readiness failures return structured codes including `profile_required`,
`borrower_verification_required`, `documents_required`, `consent_required`,
`account_not_active`, and `suspended`.

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
13. Open `/lender/applications`, open the submitted application, and send an offer.
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
    repayment proofs, audit logs, applications and offers, lender review, and lookup.
23. Confirm there is no real payment processing, e-wallet integration, automated
    reconciliation, credit-limit restoration, dispute workflow, or email
    notification workflow.

Manager accounts remain manually seeded or provisioned. Borrower and lender
accounts should use self-serve signup. Lender approval is a manual manager
review of the submitted lender profile, not automated identity verification.
Email notifications are still not implemented.

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
