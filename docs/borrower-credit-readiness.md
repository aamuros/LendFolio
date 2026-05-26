# Borrower Credit Readiness

LendFolio now treats the borrower business profile as a credit-readiness input,
not a credit score.

## Profile Fields

Borrower profiles keep the MVP financial fields and add production-readiness
context:

- Business identity: `business_name`, `business_description`, `business_type`,
  `started_operating_at`
- Business location: `business_address`, `barangay`, `city_or_municipality`,
  `province`, `location`
- Operations: `operating_model`, `primary_sales_channel`
- Revenue: `revenue_period`, `revenue_confidence`, `monthly_gross_revenue`
- Expenses: `monthly_expenses`, plus `expense_breakdown` JSON for inventory,
  rent, payroll, utilities, and other expenses
- Debt: `existing_loan_payments`, plus `debt_obligation_summary` JSON for active
  lender count, total outstanding debt, and notes
- Confirmation/review: `profile_last_confirmed_at`, `profile_review_status`
- Loan-use context: `loan_purpose_context`

Identity documents are intentionally excluded. They belong in borrower
verification.

## Statuses

Credit readiness can be:

- `incomplete`: required business profile fields are missing.
- `complete`: profile fields are present, but application gates may still be
  pending.
- `needs_review`: profile exists but has risk flags such as stale profile,
  expenses above revenue, high debt burden, vague purpose, or very new business.
- `not_eligible`: hard blockers exist such as non-positive cash flow, rejected
  profile review, or no available credit.
- `eligible_to_apply`: profile, account, consent, verification, document, and
  credit availability gates all pass.

## Application Snapshots

Loan application submission stores immutable snapshots:

- `borrower_profile_snapshot`
- `borrower_readiness_snapshot`
- `credit_readiness_status`
- `credit_limit_at_submission`
- `used_credit_at_submission`
- `available_credit_at_submission`
- `monthly_net_cash_flow_at_submission`

Lender and manager review should use these submitted snapshots when present.
Editing the borrower profile later must not change an already submitted
application.

## Enforcement

The database RPC `submit_loan_application` is the server-side gate. It returns
structured codes such as `profile_incomplete`, `profile_needs_review`,
`profile_stale`, `borrower_verification_required`, `consent_required`,
`credit_limit_exceeded`, `account_not_active`, `suspended`, and `not_eligible`.

The TypeScript helper in `lib/borrower-readiness.ts` mirrors readiness behavior
for UI guidance. The SQL functions remain the source of truth for application
submission.

## Not Credit Scoring

This does not approve or reject a loan. It only checks whether the borrower
profile is reliable, current, reviewable, and eligible to enter the lender offer
workflow.

## Local Steps

Run:

```bash
supabase db reset
npm run lint
npm run typecheck
npm run test
```
