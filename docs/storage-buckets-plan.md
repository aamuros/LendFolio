# Storage Buckets Plan

Sprint 0 defines required buckets and access expectations. Bucket creation and policy hardening should happen with the finalized Supabase migration or dashboard setup.

## Buckets

| Bucket | Purpose | Public | Expected Path Pattern |
| --- | --- | --- | --- |
| `borrower-documents` | Borrower business documents, permits, and future portfolio evidence | No | `{borrower_profile_id}/{document_id}/{filename}` |
| `lender-documents` | Lender verification and accreditation documents | No | `{lender_profile_id}/{document_id}/{filename}` |
| `repayment-proofs` | Borrower-uploaded repayment proof files | No | `{loan_id}/{repayment_schedule_id}/{proof_id}/{filename}` |

## Policy Direction

- All buckets should be private.
- Borrowers should only insert and read their own borrower documents and repayment proofs.
- Lenders should read repayment proofs only for loans assigned to them.
- Managers should read operational records needed for support and audit workflows.
- File replacement should be deliberate. If upsert is allowed later, Storage policies need `INSERT`, `SELECT`, and `UPDATE`.
- Do not expose signed URLs without checking row-level ownership and role authorization first.

## Manual Dashboard Setup

1. Open **Storage** in the Supabase dashboard.
2. Create the three private buckets listed above.
3. Do not enable public access.
4. Add Storage policies only after the database ownership model and RLS policies are finalized.
