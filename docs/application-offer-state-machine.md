# Application And Offer State Machine

LendFolio currently supports the submitted/open offer-review flow through active
loan creation and repayment proof review. Real payments, automated
reconciliation, credit restoration, scoring, and full dashboards are
intentionally outside this state machine.

## Loan Application States

| State | Meaning | Entry |
| --- | --- | --- |
| `submitted` | Borrower submitted a financing request. | Borrower creates a loan application after saving a business profile. |
| `open` | Application remains available for lender review. | Reserved for the current submitted/open review flow. |
| `accepted` | Borrower accepted one offer. | `public.accept_loan_offer(p_offer_id)` updates the application atomically. |
| `declined` | Application was declined. | Reserved for future workflow handling. |
| `withdrawn` | Borrower withdrew the request. | Reserved for future workflow handling. |

Borrowers can insert only their own `submitted` applications. Approved lenders
can read submitted/open applications and can read closed applications only when
they have a related offer. Managers can read applications for oversight. Direct
application updates are revoked from authenticated users; acceptance goes
through the database RPC.

## Loan Offer States

| State | Meaning | Entry |
| --- | --- | --- |
| `pending` | Offer is waiting for borrower review. | Approved lender creates an offer for a submitted/open application. |
| `accepted` | Borrower selected this offer. | `public.accept_loan_offer(p_offer_id)` accepts one pending offer. |
| `declined` | Offer is no longer selectable. | The acceptance RPC declines competing pending offers. |
| `expired` | Offer expired before acceptance. | Reserved for future workflow handling. |

Unapproved lenders cannot create offers. Borrowers and lenders can read offers
connected to them. Managers can read offers for oversight.

## Active Loan And Repayment States

| State | Meaning | Entry |
| --- | --- | --- |
| `active` | Accepted offer has become an active loan. | `public.accept_loan_offer(p_offer_id)` creates one active loan. |
| `paid` | Verified repayments have reduced the outstanding balance to zero. | `public.review_repayment_proof(..., 'verified', ...)` verifies the submitted proof. |
| `overdue` | Loan is past due. | Reserved for repayment monitoring. |
| `defaulted` | Loan is in default. | Reserved for later manager workflow. |
| `closed` | Loan is closed outside the normal paid path. | Reserved for later manager workflow. |

The current repayment schedule is deterministic: the application preferred term
creates 1, 3, 6, or 12 installments that total the accepted offer repayment
amount and end on the offer due date. Each installment starts as `due`.
Borrower proof upload changes an installment to `submitted`. Lender verification
changes it to `verified`; lender rejection changes it to `rejected` so the
borrower can upload corrected proof.

## Repayment Proof States

| State | Meaning | Entry |
| --- | --- | --- |
| `submitted` | Borrower uploaded payment evidence for lender review. | `public.submit_repayment_proof(...)` records private Storage metadata. |
| `verified` | Approved lender accepted the proof and the balance was reduced. | `public.review_repayment_proof(..., 'verified', ...)` updates proof, schedule, active loan, and audit logs. |
| `rejected` | Approved lender rejected the proof without reducing balance. | `public.review_repayment_proof(..., 'rejected', ...)` stores optional review notes. |

## Acceptance Invariants

- Only the borrower who owns the application can accept an offer.
- Only pending offers on submitted/open applications can be accepted.
- Acceptance updates offers and the application inside one database function.
- A partial unique index allows only one accepted offer per application.
- A partial unique index allows one pending offer per lender per application.
- Competing pending offers are declined when one offer is accepted.
- One active loan is created per accepted offer and per loan application.
- Preferred-term repayment installments are created for the active loan.
- One active submitted proof and one verified proof are allowed per repayment
  schedule.
- Verification is atomic and never reduces the active-loan outstanding balance
  below zero.
- Audit logs are written for offer acceptance, competing-offer decline,
  application acceptance, loan activation, repayment schedule creation, proof
  submission, proof review, repayment verification, balance updates, and loan
  payoff.
