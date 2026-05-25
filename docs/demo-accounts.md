# Local Demo Accounts And Workflow Data

Use the seeded local Supabase accounts when you need repeatable borrower,
lender, and manager records for QA. These accounts are for local development
only.

## Reset Local Data

```bash
supabase start
supabase db reset
```

`supabase db reset` applies every migration and then runs `supabase/seed.sql`.
The reset removes workflow rows created by prior manual testing and recreates
the local users below.

## Seeded Accounts

All seeded users use the password `LendFolio123!`.

| Role | Email | Purpose |
| --- | --- | --- |
| Borrower | `borrower@lendfolio.local` | Creates the business profile, loan application, offer acceptance, and repayment proofs. |
| Borrower | `borrower.alt@lendfolio.local` | Verifies borrower isolation. |
| Approved lender | `lender@lendfolio.local` | Reviews applications, creates offers, and reviews repayment proofs. |
| Approved lender | `lender.partner@lendfolio.local` | Creates competing offers for acceptance checks. |
| Pending lender | `lender.pending@lendfolio.local` | Verifies unapproved lenders cannot create offers. |
| Manager | `manager@lendfolio.local` | Verifies manager dashboard records, lookup, and audit logs. |

## Manual QA Flow

1. Sign in as `borrower@lendfolio.local` at `/login?role=borrower`.
2. Open `/borrower`, save a business profile, and submit a loan application.
3. Sign in as `lender@lendfolio.local` at `/login?role=lender`.
4. Open `/lender/applications`, review the submitted application, and send an offer.
5. Sign in again as `borrower@lendfolio.local`.
6. Accept the offer and confirm an active loan and repayment schedule appear.
7. Upload repayment proof for a due installment.
8. Sign in as `lender@lendfolio.local` and verify or reject the submitted proof.
9. Sign in as `manager@lendfolio.local` at `/login?role=manager`.
10. Check `/manager`, `/manager/loans`, `/manager/repayments`,
    `/manager/applications`, `/manager/audit-logs`, and `/manager/lookup`.

Useful manager states to verify:

- `loan_applications.status` becomes `accepted` after offer acceptance.
- One `loan_offers` row is `accepted`; competing pending offers become
  `declined`.
- One `active_loans` row is created for the accepted application and offer.
- `loan_repayment_schedules` rows match the application preferred term.
- `repayment_proofs.status` moves through `submitted`, `rejected`, or
  `verified`.
- `audit_logs` includes application, offer, loan, repayment schedule, proof, and
  balance events.

## Automated Verification

Run the local integration suite with Supabase test variables set:

```bash
export SUPABASE_TEST_URL=http://127.0.0.1:54321
export SUPABASE_TEST_ANON_KEY="$(supabase status -o env | awk -F= '/^ANON_KEY=/{gsub(/"/, "", $2); print $2}')"
export SUPABASE_TEST_SERVICE_ROLE_KEY="$(supabase status -o env | awk -F= '/^SERVICE_ROLE_KEY=/{gsub(/"/, "", $2); print $2}')"
npm run test
```

The database-backed tests are skipped when these variables are absent.

## Safety Notes

- Do not commit real passwords or service role keys.
- Use the seeded local accounts only for local QA.
- Keep authorization based on `profiles` and `lender_profiles`, not hardcoded
  emails.
