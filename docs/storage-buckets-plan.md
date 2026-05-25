# Storage Buckets Plan

This document tracks required private buckets and access expectations. The
repayment proof bucket is now created by migration for the MVP repayment
workflow.

## Buckets

| Bucket | Purpose | Public | Expected Path Pattern |
| --- | --- | --- | --- |
| `borrower-documents` | Borrower business documents, permits, and future portfolio evidence | No | `{borrower_profile_id}/{document_id}/{filename}` |
| `lender-documents` | Lender verification and accreditation documents | No | `{lender_profile_id}/{document_id}/{filename}` |
| `repayment-proofs` | Borrower-uploaded repayment proof files | No | `borrowers/{borrower_id}/loans/{active_loan_id}/repayments/{repayment_schedule_id}/{safe_file_name}` |

## Policy Direction

- All buckets should be private.
- Borrowers should only insert and read their own borrower documents and repayment proofs.
- Lenders should read repayment proofs only for loans assigned to them.
- Managers should read operational records needed for support and audit workflows.
- File replacement should be deliberate. If upsert is allowed later, Storage policies need `INSERT`, `SELECT`, and `UPDATE`.
- Do not expose signed URLs without checking row-level ownership and role authorization first.
- Repayment proof files are limited to JPG, PNG, WebP, or PDF files up to 5 MB.
- Repayment proof signed URLs are generated server-side for authorized borrower,
  lender, or manager reads. The UI should not expose raw private Storage paths.

## Current Setup

The `repayment-proofs` bucket and Storage policies are created in
`supabase/migrations/20260524145301_add_repayment_proofs.sql`.

The borrower and lender document buckets remain planned. If they are needed
later, create them as private buckets and add policies only after the database
ownership model is finalized.
