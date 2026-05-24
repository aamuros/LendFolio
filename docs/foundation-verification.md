# Foundation Verification

This document describes the repeatable local setup for proving LendFolio's role,
RLS, audit, and offer-acceptance foundation before active loans or repayments are
added.

## Local Database Reset

Start Supabase and reset the local database:

```bash
supabase start
supabase db reset
```

`supabase db reset` applies every migration in `supabase/migrations` and then
runs `supabase/seed.sql`.

## Seeded Test Accounts

All seeded users use the password `LendFolio123!`.

| Role | Email | Purpose |
| --- | --- | --- |
| Borrower | `borrower@lendfolio.local` | Creates the profile, application, and accepts offers. |
| Borrower | `borrower.alt@lendfolio.local` | Confirms borrowers cannot read another borrower's rows. |
| Approved lender | `lender@lendfolio.local` | Reviews open applications and creates offers. |
| Approved lender | `lender.partner@lendfolio.local` | Creates a competing offer for atomic acceptance tests. |
| Pending lender | `lender.pending@lendfolio.local` | Confirms unapproved lenders cannot create offers. |
| Manager | `manager@lendfolio.local` | Confirms manager read access to audit logs and workflow data. |

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

## What The Tests Prove

- A clean local database can be migrated and seeded.
- Borrower rows are isolated by RLS.
- Approved lenders can review open applications.
- Pending lenders cannot create offers.
- Manager users can read audit logs.
- Offer acceptance uses the database RPC and leaves exactly one accepted offer.
- Competing pending offers are declined and workflow audit logs are written.
