# RLS Plan

All application tables in the exposed `public` schema must have Row Level
Security enabled before they are used by the app.

## Role Source

Use `public.profiles.role` or trusted server-side app metadata for role
decisions. Do not use `user_metadata` for authorization because users can modify
it.

## Access Matrix

| Table | Borrower | Lender | Manager |
| --- | --- | --- | --- |
| `profiles` | Read and update own profile | Read and update own profile | Read profiles needed for operations |
| `borrower_portfolios` | Own portfolio only | Read only when tied to a reviewable application | Read for support and audit |
| `lender_profiles` | No direct access | Own lender profile only | Read for support and verification |
| `borrower_verifications` | Own verification only | No direct access | Read and review for verification queue |
| `borrower_verification_documents` | Own documents only | No direct access | Read and review for verification queue |
| `loan_applications` | Own applications only | Submitted/open applications; closed only with related offer | Read all for monitoring |
| `loan_offers` | Offers for own applications only | Own offers only | Read all for monitoring |
| `active_loans` | Own accepted loans only | Loans funded by lender only | Read all for monitoring |
| `loan_repayment_schedules` | Own loan schedules only | Schedules for funded loans only | Read all for monitoring |
| `repayment_proofs` | Own repayment proofs only | Proofs for funded loans only | Read all for monitoring |
| `user_consents` | Own consent records only | Own consent records only | Read for audit |
| `legal_documents` | Read active versions | Read active versions | Read all |
| `provisioning_events` | No direct access | No direct access | Read all |
| `notifications` | Own notifications only | Own notifications only | No direct access |
| `audit_logs` | No direct access | No direct access | Read all |

## Policy Principles

- Enable RLS before inserting data.
- `UPDATE` policies need matching `SELECT` access or updates can affect zero rows
  without an obvious error.
- Avoid broad `authenticated using (true)` policies except for intentionally
  public lookup tables.
- Keep privileged functions out of the exposed `public` schema.
- Views should use `security_invoker = true` on supported Postgres versions or
  be kept out of exposed schemas.
- Business state transitions must be server-side and protected by RLS or database
  constraints.
- Authenticated clients do not receive broad direct insert, update, or delete
  policies for workflow tables; state transitions go through controlled RPCs.

## Workflow Access Notes

- **Portfolio writes**: Authenticated borrowers can select, insert, and update
  only rows where `borrower_portfolios.borrower_id = auth.uid()`.
- **Application writes**: Authenticated borrowers can insert their own
  `submitted` applications. Application editing and withdrawal are controlled
  by server actions with RLS enforcement.
- **Offer inserts**: Only approved lenders can create pending offers for
  submitted/open applications. Unapproved lenders are blocked by RLS.
- **Offer acceptance**: Moved into the `accept_loan_offer` database RPC for
  atomic acceptance. Authenticated users do not receive broad direct update
  access to workflow records.
- **Lender closed-context access**: Approved lenders can read closed
  applications and borrower portfolio context only when they have a related
  offer. Unrelated lenders do not gain access to accepted applications, active
  loans, or repayment schedules.
- **Repayment proof access**: Borrower-owned, funding-lender, manager-read
  pattern. Authenticated clients receive metadata `SELECT` only; submission and
  review transitions go through controlled RPCs.
- **Storage access**: The `borrower-verification-documents` and
  `repayment-proofs` buckets are private. Borrowers upload under scoped paths.
  Borrowers, accepted lenders, and managers read files only when matching
  metadata authorizes the request.
- **Account provisioning**: Borrower and lender accounts are self-serve, but
  manager accounts remain manually seeded or provisioned. Self-serve signup
  metadata is provisioning input only; authorization uses trusted database rows.
  Provisioning events are manager-readable, and provisioning repair is exposed
  only through a manager-guarded RPC.
- **Lender review**: Manual manager review, not automated identity verification
  or credit scoring. Managers can read all lender profiles and use the lender
  review RPC to approve, reject with a required reason, or return rejected
  lenders to pending. Lenders can read their own lender profile but cannot
  mutate manager-only review fields or self-approve.
- **Consent records**: Append-only. Users can read and insert their own consent
  records. Legal document versions are readable by all authenticated users.
  Managers can read consent records for audit.

## Current Status

The repository includes applied migrations for profiles, borrower portfolios,
loan applications, loan offers, atomic acceptance, lender closed-context reads,
active loans, preferred-term repayment schedules, repayment proofs, borrower
verification, verification documents, consent registry, account provisioning,
lender verification profiles, notifications, credit readiness, and readiness
enforcement.

`docs/schema-draft.sql` remains a review draft, not an applied migration.
