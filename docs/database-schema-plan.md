# Database Schema Plan

This document tracks the MVP schema direction and the implemented vertical
slice. Active loans and preferred-term repayment schedules are now part of the
MVP workflow; repayment proof upload and lender review are implemented for due
installments.

## Core Entities

| Entity | Purpose | Key Relationships |
| --- | --- | --- |
| `profiles` | One application profile per `auth.users` account, including role | `id` references `auth.users.id` |
| `borrower_portfolios` | Borrower business profile foundation with business type, location, cash-flow inputs, years in operation, and loan purpose context | ADI-9 migration references `auth.users.id` directly until the broader `profiles` foundation is applied; one active MVP portfolio per borrower |
| `lender_profiles` | Manual lender verification profile with organization, contact, operating area, loan range, repayment terms, description, manager notes, and approval/rejection fields | `user_id` references `profiles.id`; review actors reference `profiles.id` |
| `loan_applications` | Borrower request for financing | borrower profile and optional portfolio |
| `loan_offers` | Official lender offer on an application | loan application, borrower, and lender |
| `active_loans` | Accepted offer converted to loan | accepted offer |
| `loan_repayment_schedules` | Expected repayment plan | active loan |
| `repayment_proofs` | Uploaded evidence for a repayment | repayment schedule and uploaded file path |
| `audit_logs` | Immutable operational history | actor profile and target record |

## Enum Direction

Expected enums:

- `app_role`: `borrower`, `lender`, `manager`
- `business_type`: `sari_sari_store`, `food_stall`, `online_seller`, `market_vendor`, `service_provider`, `other`
- `application_status`: ADI-10 starts with `submitted`, `open`; later workflow enforcement can expand to `draft`, `under_review`, `offered`, `accepted`, `declined`, `withdrawn`
- `preferred_term`: `1_month`, `3_months`, `6_months`, `12_months`
- `offer_status`: ADI-12 starts with `pending`; ADI-13 adds `accepted` and `declined` for borrower acceptance; later workflow enforcement can add expiry-specific states
- `active_loan_status`: `active`, `paid`, `overdue`, `defaulted`, `closed`
- `repayment_status`: `due`, `submitted`, `verified`, `rejected`, `late`
- `repayment_proof_status`: `submitted`, `verified`, `rejected`

## Constraints To Confirm Later

- Whether a user can hold more than one role.
- Whether lenders can see all submitted applications or only assigned applications.
- Whether audit logs are written by database triggers, server actions, or both.
- Required file metadata for uploaded documents.

## ADI-9 Borrower Portfolio MVP

The Sprint 1 borrower portfolio form currently captures:

- Business type
- Business location
- Monthly gross revenue
- Monthly expenses
- Existing monthly loan payments
- Years in operation
- Loan purpose context

The app has a server action prepared to upsert one portfolio per authenticated
borrower into `public.borrower_portfolios`. Until Supabase Auth, the final table
migration, and RLS policies are applied, the browser form also keeps a temporary
device-local draft so the MVP screen can be tested without fake production data.

The runnable ADI-9 migration is in
`supabase/migrations/20260524032832_add_borrower_portfolios.sql`. It is scoped to
portfolio persistence only and does not create loan applications, offers, active
loans, repayments, document uploads, identity verification, scoring, manager
reports, or audit logs.

## ADI-10 Loan Application MVP

The Sprint 1 borrower loan application form captures:

- Requested amount
- Purpose
- Preferred term
- Remarks

The app requires a saved borrower portfolio before submission. The server action
looks up the authenticated borrower's portfolio and inserts a submitted
application into `public.loan_applications`. Until Supabase Auth, migrations, and
RLS policies are applied, the browser keeps device-local demo submissions so the
borrower dashboard can show submitted applications after refresh.

The runnable ADI-10 migration is in
`supabase/migrations/20260524041000_add_loan_applications.sql`. It is scoped to
borrower submission and lender review queryability. Official offers,
active-loan creation, repayment schedule creation, and audit logs are
implemented by later migrations. Credit-limit calculation, repayment proof
upload, repayment verification, and manager reporting remain deferred.

## ADI-12 Loan Offer MVP

The Sprint 1 lender offer form captures:

- Approved amount
- Repayment amount
- Fees
- Due date
- Remarks

The server action inserts a pending offer into `public.loan_offers` and links it
to the source application, borrower, and signed-in lender. Borrowers can view
pending offers under the related application. Offer acceptance, active loan
creation, preferred-term repayment schedule creation, and audit logs are
implemented by later migrations. Expiry enforcement, repayment proofs,
credit-risk scoring, and manager controls remain deferred.

The runnable ADI-12 migration is in
`supabase/migrations/20260524043000_add_loan_offers.sql`.

## ADI-13 Borrower Offer Acceptance MVP

Borrowers can review offers grouped below each source application. The review
surface shows approved amount, fees, repayment amount, due date, lender name,
and lender remarks. Accepting a pending offer updates that offer to `accepted`
and updates the remaining pending offers for the same application to `declined`.

Accepted offers now create active loans and a repayment schedule through the
hardened acceptance RPC. Full repayment handling remains deferred to later
sprints.

The runnable ADI-13 migration is in
`supabase/migrations/20260524044000_add_offer_acceptance.sql`.

## Active Loan And Repayment Schedule MVP

The active-loan migration creates `active_loan_status`, `repayment_status`,
`active_loans`, and `loan_repayment_schedules`. The acceptance RPC now converts
one accepted offer into one active loan and deterministic installments using the
application preferred term. Supported terms create 1, 3, 6, or 12 installments.

Important constraints include one active loan per application, one active loan
per accepted offer, unique installment numbers per active loan, positive
principal and repayment amounts, positive amount due, non-negative fees, and
non-negative outstanding balance. RLS allows borrowers to read their own
loans/schedules, approved lenders to read funded loans/schedules, and managers
to read all records. Direct authenticated insert, update, and delete access is
not granted for active loans or schedules.

The runnable migration is in
`supabase/migrations/20260524142104_add_active_loans.sql`.

## Repayment Proof MVP

The repayment-proof migration creates `repayment_proof_status`,
`repayment_proofs`, a private `repayment-proofs` Storage bucket, metadata RLS,
Storage access policies, and RPCs for borrower submission and lender review.

Borrower submission stores the private file path and proof metadata, changes the
installment from `due` or `rejected` to `submitted`, and writes
`repayment_proof_submitted`. Lender verification marks the proof and repayment
as `verified`, reduces `active_loans.outstanding_balance` by the scheduled
amount due without going below zero, marks the active loan `paid` when the
balance reaches zero, and writes repayment and balance audit logs. Lender
rejection marks proof and repayment as `rejected`, stores optional review notes,
and leaves the outstanding balance unchanged.

Important constraints include positive file size, a 5 MB prototype file limit,
allowed proof MIME types, unique Storage paths, one active submitted proof per
repayment schedule, and one verified proof per repayment schedule. Direct
authenticated insert, update, and delete access is not granted for proof
metadata; workflow changes go through controlled RPCs.

The runnable migration is in
`supabase/migrations/20260524145301_add_repayment_proofs.sql`. Real payment
processing, e-wallet integration, automated reconciliation, credit-limit
restoration, dispute workflows, and email notifications remain deferred.

## Account Signup And Lender Verification MVP

Borrower and lender accounts are self-serve through `/signup`. Borrower signup
creates an active borrower profile. Lender signup creates an active lender
profile and a pending `public.lender_profiles` row with enough manual-review
information for managers: organization, contact person, phone number, business
address, operating area, optional registration number, loan amount range,
typical repayment terms, and lender description.

Signup requires the current Terms of Service and Privacy Notice. The current
legal document versions live in `public.legal_documents`, and accepted versions
are recorded in append-only `public.user_consents` rows through the
`accept_user_consents` RPC. Signup does not collect credit review, document
processing, or lender review consent; those remain gated at the workflows that
need them.

Manager accounts remain manually seeded or provisioned and cannot be created
through self-serve signup. Provisioning writes attempted, succeeded, and failed
events to `public.provisioning_events`; managers can run
`repair_user_provisioning(user_id)` to retry borrower or lender provisioning
without duplicating trusted rows. Managers review lenders from
`/manager/lenders` and the manager-only lender detail page. Approval stores
`approved_at`, `approved_by`, and optional review notes. Rejection stores
`rejected_at`, `rejected_by`, a required rejection reason, and optional review
notes.

This is manual platform review only. It is not automated identity verification,
KYB, credit scoring, real payment setup, e-wallet integration, automated
reconciliation, reporting, or email notification delivery.

The runnable migrations are
`supabase/migrations/20260525110149_add_account_onboarding.sql` and
`supabase/migrations/20260525115311_lender_verification_profile_depth.sql`.
Consent registry and signup baseline capture are in
`supabase/migrations/20260526050823_consent_signup_baseline.sql`.
Provisioning events, repair, and onboarding state helpers are in
`supabase/migrations/20260526051837_provisioning_lifecycle.sql`.

## Draft SQL

See `docs/schema-draft.sql`. It is a review draft, not an applied migration.
