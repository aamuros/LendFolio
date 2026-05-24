# Application And Offer State Machine

LendFolio currently supports the submitted/open offer-review flow only. Active
loans, repayments, uploads, scoring, and dashboards are intentionally outside
this state machine.

## Loan Application States

| State | Meaning | Entry |
| --- | --- | --- |
| `submitted` | Borrower submitted a financing request. | Borrower creates a loan application after saving a business profile. |
| `open` | Application remains available for lender review. | Reserved for the current submitted/open review flow. |
| `accepted` | Borrower accepted one offer. | `public.accept_loan_offer(p_offer_id)` updates the application atomically. |
| `declined` | Application was declined. | Reserved for future workflow handling. |
| `withdrawn` | Borrower withdrew the request. | Reserved for future workflow handling. |

Borrowers can insert only their own `submitted` applications. Approved lenders
and managers can read submitted/open applications. Direct application updates are
revoked from authenticated users; acceptance goes through the database RPC.

## Loan Offer States

| State | Meaning | Entry |
| --- | --- | --- |
| `pending` | Offer is waiting for borrower review. | Approved lender creates an offer for a submitted/open application. |
| `accepted` | Borrower selected this offer. | `public.accept_loan_offer(p_offer_id)` accepts one pending offer. |
| `declined` | Offer is no longer selectable. | The acceptance RPC declines competing pending offers. |
| `expired` | Offer expired before acceptance. | Reserved for future workflow handling. |

Unapproved lenders cannot create offers. Borrowers and lenders can read offers
connected to them. Managers can read offers for oversight.

## Acceptance Invariants

- Only the borrower who owns the application can accept an offer.
- Only pending offers on submitted/open applications can be accepted.
- Acceptance updates offers and the application inside one database function.
- A partial unique index allows only one accepted offer per application.
- Competing pending offers are declined when one offer is accepted.
- Audit logs are written for offer acceptance, competing-offer decline, and
  application acceptance.
