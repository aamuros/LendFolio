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
- [ ] Borrower sees the active loan after offer acceptance.
- [ ] Borrower sees the repayment installment number, amount due, due date, and repayment status.
- [ ] Borrower can upload a repayment proof file for a due installment.
- [ ] Submitted proof changes the repayment status to submitted.
- [ ] Lender sees accepted-offer history with active-loan context after acceptance.
- [ ] Lender sees submitted proof metadata and can open the proof link.
- [ ] Lender can verify a submitted proof.
- [ ] Verification marks the proof and repayment as verified.
- [ ] Verification reduces outstanding balance by the scheduled amount due.
- [ ] Lender can reject a submitted proof with an optional note.
- [ ] Rejection marks the proof and repayment as rejected and does not reduce outstanding balance.
- [ ] Manager sees the active-loan count.
- [ ] Manager sees submitted-proof and verified-repayment counts.
- [ ] Lender no longer sees invalid offer creation actions after acceptance.
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
- [ ] Active-loan repayment details include proof status and review notes when relevant.
- [ ] Borrower proof upload accepts JPG, PNG, WebP, and PDF only.
- [ ] Borrower proof upload communicates the 5 MB file limit.
- [ ] Borrower proof upload states that it does not process a real payment.

## Deferred Scope Confirmation

- [ ] Active loans and one-installment repayment schedules are present in the MVP vertical slice.
- [ ] Repayment proof upload is present.
- [ ] Submitted proof state, lender verification/rejection, and outstanding balance reduction after verification are present.
- [ ] Real payment processing, e-wallet integration, automated reconciliation, credit-limit restoration, dispute workflows, email notifications, manager reports, full audit-log UI, e-KYC, and AI scoring are not present in the Sprint 1 flow.
