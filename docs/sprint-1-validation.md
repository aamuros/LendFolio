# Manual Validation Checklist

Use this checklist after Supabase Auth and database tables/RLS policies are
configured for the target environment.

## End-to-End Happy Path

- [ ] Borrower can create an account from `/signup`.
- [ ] Borrower can sign in from `/login`.
- [ ] Borrower can save business profile.
- [ ] Borrower can upload verification documents after consent.
- [ ] Manager can review and approve borrower verification.
- [ ] Borrower can submit loan application after readiness gates pass.
- [ ] Borrower can edit a submitted application before acceptance.
- [ ] Borrower can withdraw a submitted application before acceptance.
- [ ] Lender can create an account from `/signup` with review profile.
- [ ] Lender sees pending-review messaging before approval.
- [ ] Manager can review and approve lender from `/manager/lenders`.
- [ ] Approved lender sees submitted/open applications.
- [ ] Lender can open application detail.
- [ ] Lender can send pending offer.
- [ ] Borrower sees the offer under the correct application.
- [ ] Borrower can decline a pending offer.
- [ ] Borrower can accept one pending offer.
- [ ] Accepted offer becomes accepted.
- [ ] Other pending offers for the same application become declined.
- [ ] Borrower sees the active loan after offer acceptance.
- [ ] Borrower sees repayment installment number, amount due, due date, and
  status.
- [ ] Borrower can upload a repayment proof file for a due installment.
- [ ] Submitted proof changes the repayment status to submitted.
- [ ] Lender sees accepted-offer history with active-loan context.
- [ ] Lender sees submitted proof metadata and can open the proof link.
- [ ] Lender can verify a submitted proof.
- [ ] Verification marks the proof and repayment as verified.
- [ ] Verification reduces outstanding balance by the scheduled amount due.
- [ ] Lender can reject a submitted proof with an optional note.
- [ ] Rejection marks the proof and repayment as rejected and does not reduce
  outstanding balance.
- [ ] Manager sees active-loan count.
- [ ] Manager sees submitted-proof and verified-repayment counts.
- [ ] Manager can look up borrower records from `/manager/lookup`.
- [ ] Manager can view audit logs from `/manager/audit-logs`.
- [ ] Lender no longer sees invalid offer creation actions after acceptance.
- [ ] Flow works on mobile-width viewport.

## Input Validation Checks

- [ ] Borrower can type `100` into monthly gross revenue without getting stuck
  with `0100`.
- [ ] Borrower can clear and retype monthly expenses.
- [ ] Borrower can clear and retype existing monthly loan payments.
- [ ] Borrower can type and clear requested amount, and an empty required value
  still shows validation instead of silently submitting `0`.
- [ ] Lender can type and clear approved amount and repayment amount.
- [ ] Lender can leave fees empty or set fees to `0`.

## Interaction Checks

- [ ] Borrower can expand and collapse an application with keyboard and pointer.
- [ ] Borrower can expand and collapse an offer with keyboard and pointer.
- [ ] Pending offers are easy to identify before acceptance.
- [ ] Accepted and declined offer states remain clear after acceptance.
- [ ] Active-loan repayment details include proof status and review notes when
  relevant.

## File Upload Checks

- [ ] Borrower proof upload accepts JPG, PNG, WebP, and PDF only.
- [ ] Borrower proof upload communicates the 5 MB file limit.
- [ ] Borrower proof upload states that it does not process a real payment.
- [ ] Borrower verification upload accepts JPG, PNG, WebP, and PDF only.
- [ ] Borrower verification upload communicates the 5 MB file limit.

## Deferred Scope Confirmation

- [ ] Active loans and preferred-term repayment schedules are present.
- [ ] Repayment proof upload and lender review are present.
- [ ] Borrower verification lifecycle is present.
- [ ] Consent tracking and enforcement are present.
- [ ] Credit readiness evaluation is present.
- [ ] Real payment processing, e-wallet integration, automated reconciliation,
  credit-limit restoration, dispute workflows, email notifications, manager
  reports, e-KYC, and AI scoring are not present.
