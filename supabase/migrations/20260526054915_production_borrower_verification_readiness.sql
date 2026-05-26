alter type public.borrower_verification_status add value if not exists 'not_started';
alter type public.borrower_verification_status add value if not exists 'pending_documents';
alter type public.borrower_verification_status add value if not exists 'submitted';
alter type public.borrower_verification_status add value if not exists 'under_review';
alter type public.borrower_verification_status add value if not exists 'needs_resubmission';
