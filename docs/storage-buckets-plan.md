# Storage Buckets Plan

This document tracks private Storage buckets and access expectations.

## Buckets

| Bucket | Purpose | Public | Expected Path Pattern | Created By |
| --- | --- | --- | --- | --- |
| `borrower-verification-documents` | Borrower identity verification uploads (valid ID, business proof) | No | `borrowers/{borrower_id}/verification/{verification_id}/{safe_file_name}` | Verification migration |
| `repayment-proofs` | Borrower-uploaded repayment proof files | No | `borrowers/{borrower_id}/loans/{active_loan_id}/repayments/{repayment_schedule_id}/{safe_file_name}` | Repayment proof migration |
| `borrower-documents` | Borrower business documents, permits, and future portfolio evidence | No | `{borrower_profile_id}/{document_id}/{filename}` | Planned |
| `lender-documents` | Lender verification and accreditation documents | No | `{lender_profile_id}/{document_id}/{filename}` | Planned |

## Policy Direction

- All buckets are private.
- Borrowers can insert and read only their own documents and proofs.
- Lenders can read repayment proofs only for loans assigned to them.
- Managers can read operational records needed for support and audit workflows.
- File replacement should be deliberate. If upsert is allowed later, Storage
  policies need `INSERT`, `SELECT`, and `UPDATE`.
- Do not expose signed URLs without checking row-level ownership and role
  authorization first.
- Signed URLs are generated server-side for authorized borrower, lender, or
  manager reads. The UI does not expose raw private Storage paths.

## File Constraints

| Constraint | Value |
| --- | --- |
| Allowed MIME types | `image/jpeg`, `image/png`, `image/webp`, `application/pdf` |
| Maximum file size | 5 MB |

## Current Status

- `borrower-verification-documents` bucket and Storage policies are created in
  `supabase/migrations/20260526004411_add_borrower_verification_documents.sql`.
- `repayment-proofs` bucket and Storage policies are created in
  `supabase/migrations/20260524145301_add_repayment_proofs.sql`.
- `borrower-documents` and `lender-documents` buckets remain planned. Create
  them as private buckets with policies only after the database ownership model
  is finalized for those features.
