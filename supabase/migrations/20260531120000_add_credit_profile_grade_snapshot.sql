alter table public.loan_applications
  add column if not exists borrower_credit_profile_grade text,
  add column if not exists borrower_credit_profile_assessment jsonb;
