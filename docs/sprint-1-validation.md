# Sprint 1 Validation Checklist

Use this checklist after Supabase Auth and the Sprint 1 tables/RLS policies are configured for the deployed environment.

## End-to-End Happy Path

- [ ] Borrower can sign in.
- [ ] Borrower can save portfolio.
- [ ] Borrower can submit loan application.
- [ ] Lender can sign in.
- [ ] Lender sees the submitted/open application.
- [ ] Lender can open application detail.
- [ ] Lender can send pending offer.
- [ ] Borrower sees the offer under the correct application.
- [ ] Borrower can accept one pending offer.
- [ ] Accepted offer becomes accepted.
- [ ] Other pending offers for the same application become declined.
- [ ] Lender no longer sees obviously invalid action states after acceptance, if currently supported by existing logic.
- [ ] Flow works on mobile-width viewport.

## Focused UI Checks

- [ ] Borrower can type `100` into monthly gross revenue without getting stuck with `0100`.
- [ ] Borrower can clear and retype monthly expenses.
- [ ] Borrower can clear and retype existing monthly loan payments.
- [ ] Borrower can type and clear requested amount, and an empty required value still shows validation instead of silently submitting `0`.
- [ ] Lender can type and clear approved amount and repayment amount.
- [ ] Lender can leave fees empty or set fees to `0`.
- [ ] Borrower can expand and collapse an application with keyboard and pointer input.
- [ ] Borrower can expand and collapse an offer with keyboard and pointer input.
- [ ] Pending offers are easy to identify before acceptance.
- [ ] Accepted and declined offer states remain clear after acceptance.

## Deferred Scope Confirmation

- [ ] Accepted offers are still represented as offer records only.
- [ ] Active loans, repayment schedules, repayment proof upload, manager reports, audit logs, payments, e-KYC, and AI scoring are not present in the Sprint 1 flow.
