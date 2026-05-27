# Local Test Accounts And Workflow Data

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
| Borrower | `borrower@lendfolio.local` | Business profile, verification, loan application, offer acceptance, repayment proofs |
| Borrower | `borrower.alt@lendfolio.local` | Verifies borrower data isolation |
| Approved lender | `lender@lendfolio.local` | Reviews applications, creates offers, reviews repayment proofs |
| Approved lender | `lender.partner@lendfolio.local` | Creates competing offers for acceptance checks |
| Pending lender | `lender.pending@lendfolio.local` | Verifies unapproved lenders cannot create offers |
| Manager | `manager@lendfolio.local` | Dashboard records, verification queue, lender review, lookup, audit logs |

## Manual QA Flow

1. Sign in as `borrower@lendfolio.local` at `/login?role=borrower`.
2. Open `/borrower`, save a business profile.
3. Upload verification documents (valid ID and business proof).
4. Sign in as `manager@lendfolio.local` at `/login?role=manager`.
5. Open `/manager/borrower-verifications`, accept documents, approve
   verification.
6. Sign back in as the borrower.
7. Accept loan application disclosures and submit a loan application.
8. Sign in as `lender@lendfolio.local` at `/login?role=lender`.
9. Open `/lender/applications`, review the submitted application, send an offer.
10. Sign in again as `borrower@lendfolio.local`.
11. Accept the offer and confirm an active loan and repayment schedule appear.
12. Upload repayment proof for a due installment.
13. Sign in as `lender@lendfolio.local` and verify or reject the submitted proof.
14. Sign in as `manager@lendfolio.local` at `/login?role=manager`.
15. Check `/manager`, `/manager/loans`, `/manager/repayments`,
    `/manager/applications`, `/manager/audit-logs`, `/manager/lenders`,
    `/manager/borrower-verifications`, and `/manager/lookup`.

### Manager States To Verify

- `loan_applications.status` becomes `accepted` after offer acceptance.
- One `loan_offers` row is `accepted`; competing pending offers become
  `declined`.
- One `active_loans` row is created for the accepted application and offer.
- `loan_repayment_schedules` rows match the application preferred term.
- `repayment_proofs.status` moves through `submitted`, `rejected`, or
  `verified`.
- `audit_logs` includes application, offer, loan, repayment schedule, proof, and
  balance events.
- `notifications` include workflow event notifications for affected users.

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
