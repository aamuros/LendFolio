# RLS Plan

All application tables in the exposed `public` schema must have Row Level Security enabled before they are used by the app.

## Role Source

Use `public.profiles.role` or trusted server-side app metadata for role decisions. Do not use `user_metadata` for authorization because users can modify it.

## Baseline Expectations

| Table | Borrower | Lender | Manager |
| --- | --- | --- | --- |
| `profiles` | Read and update own profile | Read and update own profile | Read profiles needed for operations |
| `borrower_portfolios` | Own portfolio only | Read only when tied to an application they may review | Read for support and audit |
| `lender_profiles` | No direct access | Own lender profile only | Read for support and verification |
| `loan_applications` | Own applications only | Applications assigned or visible to eligible lenders | Read all for monitoring |
| `loan_offers` | Offers for own applications only | Own offers only | Read all for monitoring |
| `active_loans` | Own accepted loans only | Loans funded by lender only | Read all for monitoring |
| `repayment_schedules` | Own loan schedules only | Schedules for own loans only | Read all for monitoring |
| `repayment_proofs` | Own repayment proofs only | Proofs for own loans only | Read all for monitoring |
| `audit_logs` | No direct access | No direct access | Read all |

## Policy Notes

- Enable RLS before inserting production or demo data.
- `UPDATE` policies need matching `SELECT` access or updates can affect zero rows without an obvious error.
- ADI-9 portfolio writes allow authenticated borrowers to select, insert, and update only rows where `borrower_portfolios.borrower_id = auth.uid()`. The ADI-9 migration references `auth.users.id` directly because the full `profiles` migration has not been applied yet.
- ADI-10 loan application writes allow authenticated borrowers to insert rows where `loan_applications.borrower_id = auth.uid()` and to read their own applications. A temporary Sprint 1 demo read policy allows authenticated users to query submitted/open applications for the verified lender demo flow until `profiles.role` and lender assignment rules exist.
- ADI-11 adds a temporary Sprint 1 demo read policy for `borrower_portfolios` only when the profile is tied to a submitted/open application. Sprint 2 should replace this with lender eligibility and assignment checks.
- ADI-12 adds `loan_offers` with pending-only inserts by authenticated lender demo users. Borrowers can read offers tied to their user ID, and lenders can read offers they created.
- ADI-13 allows authenticated borrowers to update only their own currently pending offers to `accepted` or `declined` so one offer can be accepted and competing pending offers on the same application can be closed. The migration restricts authenticated `loan_offers` updates to the `status` and `updated_at` columns so borrowers cannot alter lender offer economics through direct API calls. Expiry enforcement and broader workflow transition rules remain deferred.
- Avoid broad `authenticated using (true)` policies except for intentionally public lookup tables.
- Keep privileged functions out of the exposed `public` schema.
- Views should use `security_invoker = true` on supported Postgres versions or be kept out of exposed schemas.
- Business state transitions must be server-side and protected by RLS or database constraints in later sprint work.

## Sprint 0 Status

The current repository includes a SQL draft for review only. It should not be applied until the team confirms table names, required columns, role behavior, and policy coverage.
