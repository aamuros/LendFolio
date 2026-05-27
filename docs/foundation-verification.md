# Foundation Verification

This document describes the repeatable local setup for verifying LendFolio's
role-based access, RLS policies, audit logging, and workflow integrity.

## Local Database Reset

Start Supabase and reset the local database:

```bash
supabase start
supabase db reset
```

`supabase db reset` applies every migration in `supabase/migrations/` and then
runs `supabase/seed.sql`.

## Seeded Test Accounts

All seeded users use the password `LendFolio123!`.

| Role | Email | Purpose |
| --- | --- | --- |
| Borrower | `borrower@lendfolio.local` | Creates the profile, application, and accepts offers |
| Borrower | `borrower.alt@lendfolio.local` | Confirms borrower data isolation |
| Approved lender | `lender@lendfolio.local` | Reviews open applications and creates offers |
| Approved lender | `lender.partner@lendfolio.local` | Creates a competing offer for atomic acceptance tests |
| Pending lender | `lender.pending@lendfolio.local` | Confirms unapproved lenders cannot create offers |
| Manager | `manager@lendfolio.local` | Confirms manager read access to audit logs and workflow data |

Borrower and lender accounts can also be created from `/signup`. Borrower
signup creates an active borrower profile. Lender signup creates an active
lender profile plus a pending `lender_profiles` row with the submitted manual
review information. Manager accounts remain manually seeded or provisioned.

## Running Database Integration Tests

Export the local Supabase values, then run the tests:

```bash
export SUPABASE_TEST_URL=http://127.0.0.1:54321
export SUPABASE_TEST_ANON_KEY="$(supabase status -o env | awk -F= '/^ANON_KEY=/{gsub(/"/, "", $2); print $2}')"
export SUPABASE_TEST_SERVICE_ROLE_KEY="$(supabase status -o env | awk -F= '/^SERVICE_ROLE_KEY=/{gsub(/"/, "", $2); print $2}')"
npm run test
```

The Supabase-local tests are skipped when these variables are absent, so the
unit tests can still run without Docker. CI starts Supabase, resets the database,
sets these variables, and runs the full suite.

## Test Coverage

The database integration tests verify:

- Clean local database migration and seeding
- Borrower row isolation by RLS
- Approved lender access to open applications
- Pending lender offer creation blocked
- Rejected lender offer creation blocked
- Manager read access to audit logs
- Manager lender profile listing, detail, approval, and rejection
- Atomic offer acceptance with exactly one accepted offer
- Competing pending offer decline with audit logs
- Borrower verification lifecycle
- Consent recording and enforcement
- Credit readiness evaluation
- Application snapshot integrity
- Active loan and repayment schedule creation
- Repayment proof submission and review
- Outstanding balance updates
- Notification delivery for workflow events

Lender approval is manual manager review, not automated identity verification,
KYB, credit scoring, or payment setup. Email notifications are not implemented.
