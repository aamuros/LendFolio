# Borrower Credit Readiness

LendFolio treats the borrower business profile as a credit-readiness input, not
a credit score. This evaluation determines whether a borrower is eligible to
enter the lender offer workflow.

## Profile Fields

Borrower profiles capture business and financial context:

- **Business identity**: `business_name`, `business_description`,
  `business_type`, `started_operating_at`
- **Business location**: `business_address`, `barangay`,
  `city_or_municipality`, `province`, `location`
- **Operations**: `operating_model`, `primary_sales_channel`
- **Revenue**: `revenue_period`, `revenue_confidence`, `monthly_gross_revenue`
- **Expenses**: `monthly_expenses`, plus `expense_breakdown` JSON for inventory,
  rent, payroll, utilities, and other expenses
- **Debt**: `existing_loan_payments`, plus `debt_obligation_summary` JSON for
  active lender count, total outstanding debt, and notes
- **Confirmation**: `profile_last_confirmed_at`, `profile_review_status`
- **Loan-use context**: `loan_purpose_context`

Identity documents are excluded from the business profile. They belong in
borrower verification.

## Credit Readiness Statuses

| Status | Meaning |
| --- | --- |
| `incomplete` | Required business profile fields are missing |
| `complete` | Profile fields are present, but application gates may still be pending |
| `needs_review` | Profile exists but has risk flags (stale profile, expenses above revenue, high debt burden, vague purpose, or very new business) |
| `not_eligible` | Hard blockers exist (non-positive cash flow, rejected profile review, or no available credit) |
| `eligible_to_apply` | All profile, account, consent, verification, document, and credit availability gates pass |

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
Editing the borrower profile later does not change an already submitted
application.

## Enforcement

The database RPC `submit_loan_application` is the server-side gate. It returns
structured failure codes:

| Code | Meaning |
| --- | --- |
| `profile_incomplete` | Required profile fields are missing |
| `profile_needs_review` | Profile has risk flags |
| `profile_stale` | Profile has not been confirmed recently |
| `borrower_verification_required` | Borrower verification not approved |
| `consent_required` | Required consent not accepted |
| `credit_limit_exceeded` | Requested amount exceeds available credit |
| `account_not_active` | Account is not in active status |
| `suspended` | Account is suspended |
| `not_eligible` | Hard blocker prevents submission |

The TypeScript helper in `lib/borrower-readiness.ts` mirrors readiness behavior
for UI guidance. The SQL functions remain the source of truth for application
submission.

## Scope

This is not credit scoring. It does not approve or reject a loan. It only checks
whether the borrower profile is reliable, current, reviewable, and eligible to
enter the lender offer workflow.

## Local Verification

```bash
supabase db reset
npm run lint
npm run typecheck
npm run test
```
