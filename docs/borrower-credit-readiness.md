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

## Borrower Credit Profile Grade

LendFolio computes a deterministic, explainable credit profile grade for each
loan application. This grade summarizes profile completeness, cash flow
strength, debt burden, verification status, and risk flags for lender and
manager review.

**This is not a formal credit score.** The grade supports review but does not
approve or reject loans. Eligibility is enforced by verification, consent,
readiness, and credit-cap rules.

### Grades

| Grade | Meaning |
| --- | --- |
| `A` | Strong profile: positive cash flow, low debt burden, verified information, few or no risk flags |
| `B` | Acceptable profile with minor or explainable risk signals |
| `C` | Eligible but notable risk signals; careful lender review recommended |
| `review_needed` | Profile or readiness requires manager or borrower action |
| `not_eligible` | Hard blocker prevents application |
| `incomplete` | Required profile or verification inputs are missing |

### Factors

The grade considers:

- Readiness status (incomplete, needs_review, not_eligible, eligible_to_apply)
- Monthly net cash flow
- Debt burden ratio
- Available credit and credit utilization
- Years in operation
- Revenue confidence (self-declared vs. document-supported)
- Verification status
- Profile staleness

The grade is computed by `evaluateBorrowerCreditProfileGrade()` in
`lib/borrower-credit-profile-grade.ts`. Each assessment includes:

- Grade and label
- Positive factors
- Risk factors
- Improvement actions

### Borrower-Facing UI

Borrowers see "Profile readiness" and "Borrowing power." They do not see the
credit profile grade directly. Improvement actions are surfaced under "Ways to
improve your profile."

### Lender-Facing UI

Lenders see the Credit Profile Grade on application detail pages with:

- Grade letter and label
- Positive factors
- Risk notes
- Explanation that this is an internal profile grade, not a formal credit score

### Manager-Facing UI

Managers see the grade in the borrower readiness panel and can inspect positive
factors, risk factors, and improvement actions.

## Application Snapshots

Loan application submission stores immutable snapshots:

- `borrower_profile_snapshot`
- `borrower_readiness_snapshot`
- `credit_readiness_status`
- `credit_limit_at_submission`
- `used_credit_at_submission`
- `available_credit_at_submission`
- `monthly_net_cash_flow_at_submission`
- `borrower_credit_profile_grade`
- `borrower_credit_profile_assessment`

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
enter the lender offer workflow. The credit profile grade is an explainable
internal profile readiness summary that supports lender and manager review.

## Local Verification

```bash
supabase db reset
npm run lint
npm run typecheck
npm run test
```
