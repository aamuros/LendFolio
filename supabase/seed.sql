create extension if not exists pgcrypto;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  phone_change,
  phone_change_token,
  email_change_token_current,
  reauthentication_token,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  is_sso_user,
  is_anonymous,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'borrower@lendfolio.local',
    crypt('LendFolio123!', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{}'::jsonb,
    false,
    false,
    false,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'borrower.alt@lendfolio.local',
    crypt('LendFolio123!', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{}'::jsonb,
    false,
    false,
    false,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'lender@lendfolio.local',
    crypt('LendFolio123!', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{}'::jsonb,
    false,
    false,
    false,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '44444444-4444-4444-4444-444444444444',
    'authenticated',
    'authenticated',
    'lender.partner@lendfolio.local',
    crypt('LendFolio123!', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{}'::jsonb,
    false,
    false,
    false,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '55555555-5555-5555-5555-555555555555',
    'authenticated',
    'authenticated',
    'lender.pending@lendfolio.local',
    crypt('LendFolio123!', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{}'::jsonb,
    false,
    false,
    false,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '66666666-6666-6666-6666-666666666666',
    'authenticated',
    'authenticated',
    'manager@lendfolio.local',
    crypt('LendFolio123!', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{}'::jsonb,
    false,
    false,
    false,
    now(),
    now()
  )
on conflict (id) do update
set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  confirmation_token = excluded.confirmation_token,
  recovery_token = excluded.recovery_token,
  email_change_token_new = excluded.email_change_token_new,
  email_change = excluded.email_change,
  phone_change = excluded.phone_change,
  phone_change_token = excluded.phone_change_token,
  email_change_token_current = excluded.email_change_token_current,
  reauthentication_token = excluded.reauthentication_token,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

insert into auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  id,
  id::text,
  id,
  jsonb_build_object(
    'sub',
    id::text,
    'email',
    email,
    'email_verified',
    true,
    'phone_verified',
    false
  ),
  'email',
  now(),
  now(),
  now()
from auth.users
where id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666'
)
on conflict (provider, provider_id) do update
set
  identity_data = excluded.identity_data,
  updated_at = now();

insert into public.profiles (id, role, display_name, status)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'borrower',
    'Borrower One',
    'active'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'borrower',
    'Borrower Two',
    'active'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'lender',
    'Approved Lender',
    'active'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'lender',
    'Partner Lender',
    'active'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'lender',
    'Pending Lender',
    'active'
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    'manager',
    'Platform Manager',
    'active'
  )
on conflict (id) do update
set
  role = excluded.role,
  display_name = excluded.display_name,
  status = excluded.status,
  updated_at = now();

insert into public.lender_profiles (
  user_id,
  organization_name,
  contact_person,
  phone_number,
  business_address,
  operating_area,
  business_registration_number,
  min_loan_amount,
  max_loan_amount,
  typical_repayment_terms,
  lender_description,
  verification_status,
  approved_at,
  approved_by,
  rejected_at,
  rejected_by,
  rejection_reason,
  manager_review_notes
)
values
  (
    '33333333-3333-3333-3333-333333333333',
    'Approved Capital',
    'Ana Reyes',
    '+63 917 555 0101',
    '12 Finance Street, Makati City',
    'Metro Manila',
    'BRN-APPROVED-001',
    5000,
    75000,
    '1 to 6 months with monthly repayment',
    'Community lender focused on working capital for neighborhood merchants.',
    'approved',
    now(),
    '66666666-6666-6666-6666-666666666666',
    null,
    null,
    null,
    'Seeded approved lender for MVP workflow testing.'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'Partner Capital',
    'Ben Cruz',
    '+63 917 555 0102',
    '44 Market Road, Quezon City',
    'Metro Manila and nearby provinces',
    'BRN-PARTNER-002',
    10000,
    100000,
    '3 to 12 months with monthly repayment',
    'Verified lending partner serving micro-retail and service businesses.',
    'approved',
    now(),
    '66666666-6666-6666-6666-666666666666',
    null,
    null,
    null,
    'Seeded approved lender for competing offer tests.'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'Pending Capital',
    'Carlo Dela Cruz',
    '+63 917 555 0103',
    '8 Provincial Avenue, Caloocan City',
    'Caloocan and Valenzuela',
    null,
    3000,
    40000,
    '1 to 3 months with weekly or monthly repayment',
    'Pending lending organization awaiting manual manager verification.',
    'pending',
    null,
    null,
    null,
    null,
    null,
    null
  )
on conflict (user_id) do update
set
  organization_name = excluded.organization_name,
  contact_person = excluded.contact_person,
  phone_number = excluded.phone_number,
  business_address = excluded.business_address,
  operating_area = excluded.operating_area,
  business_registration_number = excluded.business_registration_number,
  min_loan_amount = excluded.min_loan_amount,
  max_loan_amount = excluded.max_loan_amount,
  typical_repayment_terms = excluded.typical_repayment_terms,
  lender_description = excluded.lender_description,
  verification_status = excluded.verification_status,
  approved_at = excluded.approved_at,
  approved_by = excluded.approved_by,
  rejected_at = excluded.rejected_at,
  rejected_by = excluded.rejected_by,
  rejection_reason = excluded.rejection_reason,
  manager_review_notes = excluded.manager_review_notes,
  updated_at = now();

insert into public.borrower_verifications (
  borrower_id,
  verification_status,
  submitted_at,
  reviewed_at,
  reviewed_by,
  manager_review_notes
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'approved',
    now(),
    now(),
    '66666666-6666-6666-6666-666666666666',
    'Seeded approved borrower for MVP workflow testing.'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'approved',
    now(),
    now(),
    '66666666-6666-6666-6666-666666666666',
    'Seeded approved borrower for isolation tests.'
  )
on conflict (borrower_id) do update
set
  verification_status = excluded.verification_status,
  submitted_at = excluded.submitted_at,
  reviewed_at = excluded.reviewed_at,
  reviewed_by = excluded.reviewed_by,
  manager_review_notes = excluded.manager_review_notes,
  rejection_reason = null,
  updated_at = now();

insert into public.borrower_verification_documents (
  borrower_verification_id,
  borrower_id,
  storage_path,
  document_type,
  file_name,
  file_type,
  file_size,
  status,
  reviewed_at,
  reviewed_by
)
select
  borrower_verifications.id,
  borrower_verifications.borrower_id,
  concat(
    'borrowers/',
    borrower_verifications.borrower_id::text,
    '/verification/',
    borrower_verifications.id::text,
    '/',
    document_type,
    '.pdf'
  ),
  document_type::public.borrower_verification_document_type,
  concat(document_type, '.pdf'),
  'application/pdf',
  1024,
  'accepted',
  now(),
  '66666666-6666-6666-6666-666666666666'
from public.borrower_verifications
cross join (
  values ('valid_id'), ('business_proof')
) as required_documents(document_type)
where borrower_verifications.borrower_id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
)
on conflict (storage_bucket, storage_path) do nothing;

insert into public.user_consents (
  user_id,
  consent_type,
  version,
  user_agent
)
select
  profiles.id,
  consent.consent_type::public.user_consent_type,
  consent.version,
  'local seed'
from public.profiles
cross join (
  values
    ('terms_of_service', '2026-05-terms-v1'),
    ('privacy_notice', '2026-05-privacy-v1'),
    ('credit_review_authorization', '2026-05-credit-review-v1'),
    ('document_processing_consent', '2026-05-document-processing-v1'),
    ('lender_review_consent', '2026-05-lender-review-v1')
) as consent(consent_type, version)
where profiles.id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555'
)
on conflict (user_id, consent_type, version) do nothing;
