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

-- ============================================================
-- EXTENDED SEED: Realistic workflow data for manager dashboard
-- ============================================================

-- Backdate existing profiles for monthly headcount chart
update public.profiles set created_at = '2026-02-01T00:00:00Z'::timestamptz
  where id in ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666666');
update public.profiles set created_at = '2026-03-01T00:00:00Z'::timestamptz
  where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set created_at = '2026-04-01T00:00:00Z'::timestamptz
  where id = '44444444-4444-4444-4444-444444444444';

-- Additional auth users for more realistic headcount spread
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, confirmation_token, recovery_token,
  email_change_token_new, email_change, phone_change, phone_change_token,
  email_change_token_current, reauthentication_token,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, is_sso_user, is_anonymous, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000',
   '77777777-7777-7777-7777-777777777777', 'authenticated', 'authenticated',
   'elena.lim@lendfolio.local', crypt('LendFolio123!', gen_salt('bf')),
   now(), '', '', '', '', '', '', '', '',
   '{"provider": "email", "providers": ["email"]}'::jsonb, '{}'::jsonb,
   false, false, false, '2026-03-15T00:00:00Z'::timestamptz, now()),
  ('00000000-0000-0000-0000-000000000000',
   '88888888-8888-8888-8888-888888888888', 'authenticated', 'authenticated',
   'roberto.cruz@lendfolio.local', crypt('LendFolio123!', gen_salt('bf')),
   now(), '', '', '', '', '', '', '', '',
   '{"provider": "email", "providers": ["email"]}'::jsonb, '{}'::jsonb,
   false, false, false, '2026-04-15T00:00:00Z'::timestamptz, now()),
  ('00000000-0000-0000-0000-000000000000',
   '99999999-9999-9999-9999-999999999999', 'authenticated', 'authenticated',
   'metro.funds@lendfolio.local', crypt('LendFolio123!', gen_salt('bf')),
   now(), '', '', '', '', '', '', '', '',
   '{"provider": "email", "providers": ["email"]}'::jsonb, '{}'::jsonb,
   false, false, false, '2026-05-01T00:00:00Z'::timestamptz, now())
on conflict (id) do update
set email = excluded.email, encrypted_password = excluded.encrypted_password,
    email_confirmed_at = excluded.email_confirmed_at, updated_at = now();

insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select id, id::text, id,
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true, 'phone_verified', false),
  'email', now(), now(), now()
from auth.users
where id in ('77777777-7777-7777-7777-777777777777','88888888-8888-8888-8888-888888888888','99999999-9999-9999-9999-999999999999')
on conflict (provider, provider_id) do update set identity_data = excluded.identity_data, updated_at = now();

insert into public.profiles (id, role, display_name, status, created_at)
values
  ('77777777-7777-7777-7777-777777777777', 'borrower', 'Elena Lim', 'active', '2026-03-15T00:00:00Z'::timestamptz),
  ('88888888-8888-8888-8888-888888888888', 'borrower', 'Roberto Cruz', 'active', '2026-04-15T00:00:00Z'::timestamptz),
  ('99999999-9999-9999-9999-999999999999', 'lender', 'Metro Funds', 'active', '2026-05-01T00:00:00Z'::timestamptz)
on conflict (id) do update
set role = excluded.role, display_name = excluded.display_name, status = excluded.status, updated_at = now();

-- Lender profile for Metro Funds (approved)
insert into public.lender_profiles (
  user_id, organization_name, contact_person, phone_number, business_address,
  operating_area, business_registration_number, min_loan_amount, max_loan_amount,
  typical_repayment_terms, lender_description, verification_status, approved_at, approved_by, manager_review_notes
)
values (
  '99999999-9999-9999-9999-999999999999', 'Metro Funds', 'Diana Sy',
  '+63 917 555 0104', '88 Ortigas Center, Pasig City', 'Metro Manila and Cebu',
  'BRN-METRO-003', 8000, 120000,
  '1 to 12 months with monthly repayment',
  'Digital-first microlending for urban micro-entrepreneurs.',
  'approved', '2026-05-02T00:00:00Z'::timestamptz,
  '66666666-6666-6666-6666-666666666666', 'Approved after manual document review.'
)
on conflict (user_id) do update
set organization_name = excluded.organization_name, verification_status = excluded.verification_status,
    approved_at = excluded.approved_at, approved_by = excluded.approved_by, manager_review_notes = excluded.manager_review_notes,
    updated_at = now();

-- Verification & consents for new users
insert into public.borrower_verifications (borrower_id, verification_status, submitted_at, reviewed_at, reviewed_by, manager_review_notes)
values
  ('77777777-7777-7777-7777-777777777777', 'approved', '2026-03-16T00:00:00Z'::timestamptz, '2026-03-17T00:00:00Z'::timestamptz, '66666666-6666-6666-6666-666666666666', 'Verified — valid ID and business proof submitted.'),
  ('88888888-8888-8888-8888-888888888888', 'submitted', '2026-04-16T00:00:00Z'::timestamptz, null, null, null)
on conflict (borrower_id) do update
set verification_status = excluded.verification_status, submitted_at = excluded.submitted_at,
    reviewed_at = excluded.reviewed_at, reviewed_by = excluded.reviewed_by,
    manager_review_notes = excluded.manager_review_notes, rejection_reason = null, updated_at = now();

-- Documents for Elena (approved)
insert into public.borrower_verification_documents (
  borrower_verification_id, borrower_id, storage_path, document_type, file_name, file_type, file_size, status, reviewed_at, reviewed_by
)
select bv.id, bv.borrower_id,
  concat('borrowers/', bv.borrower_id::text, '/verification/', bv.id::text, '/', dt.doc_type, '.pdf'),
  dt.doc_type::public.borrower_verification_document_type,
  concat(dt.doc_type, '.pdf'), 'application/pdf', 1024, 'accepted',
  '2026-03-17T00:00:00Z'::timestamptz, '66666666-6666-6666-6666-666666666666'
from public.borrower_verifications bv
cross join (values ('valid_id'), ('business_proof')) as dt(doc_type)
where bv.borrower_id = '77777777-7777-7777-7777-777777777777'
on conflict (storage_bucket, storage_path) do nothing;

-- Documents for Roberto (submitted, pending review)
insert into public.borrower_verification_documents (
  borrower_verification_id, borrower_id, storage_path, document_type, file_name, file_type, file_size, status, reviewed_at, reviewed_by
)
select bv.id, bv.borrower_id,
  concat('borrowers/', bv.borrower_id::text, '/verification/', bv.id::text, '/', dt.doc_type, '.pdf'),
  dt.doc_type::public.borrower_verification_document_type,
  concat(dt.doc_type, '.pdf'), 'application/pdf', 1024, 'submitted', null, null
from public.borrower_verifications bv
cross join (values ('valid_id'), ('business_proof')) as dt(doc_type)
where bv.borrower_id = '88888888-8888-8888-8888-888888888888'
on conflict (storage_bucket, storage_path) do nothing;

-- Consents for new users
insert into public.user_consents (user_id, consent_type, version, user_agent)
select p.id, c.consent_type::public.user_consent_type, c.version, 'local seed'
from public.profiles p
cross join (values
  ('terms_of_service', '2026-05-terms-v1'),
  ('privacy_notice', '2026-05-privacy-v1'),
  ('credit_review_authorization', '2026-05-credit-review-v1'),
  ('document_processing_consent', '2026-05-document-processing-v1'),
  ('lender_review_consent', '2026-05-lender-review-v1')
) as c(consent_type, version)
where p.id in ('77777777-7777-7777-7777-777777777777','88888888-8888-8888-8888-888888888888','99999999-9999-9999-9999-999999999999')
on conflict (user_id, consent_type, version) do nothing;

-- ============================================================
-- Borrower Portfolios (required for loan applications)
-- ============================================================
insert into public.borrower_portfolios (
  borrower_id, business_name, business_type, business_description,
  location, business_address, barangay, city_or_municipality, province,
  monthly_gross_revenue, monthly_expenses, existing_loan_payments, years_in_operation,
  loan_purpose_context, operating_model, primary_sales_channel,
  revenue_period, revenue_confidence, profile_review_status
)
values
  -- Juan Santos: Sari-sari store, 2 years, healthy cash flow
  ('11111111-1111-1111-1111-111111111111', 'Santos Sari-Sari Store', 'sari_sari_store',
   'Neighborhood convenience store selling canned goods, snacks, beverages, and daily essentials.',
   'Quezon City', '45 Mabini Street, Brgy. Commonwealth, Quezon City',
   'Commonwealth', 'Quezon City', 'Metro Manila',
   45000, 28000, 0, 2.5,
   'Working capital to restock fast-moving inventory and expand product selection.',
   'fixed_store', 'walk_in', 'average_monthly_last_3_months', 'partially_documented', 'reviewed'),
  -- Maria Garcia: Food stall, 1.5 years, moderate cash flow
  ('22222222-2222-2222-2222-222222222222', 'Garcia Food House', 'food_stall',
   'Food stall at a public market serving home-cooked Filipino meals and snacks.',
   'Makati City', '12 Rizal Avenue, Poblacion, Makati City',
   'Poblacion', 'Makati City', 'Metro Manila',
   60000, 38000, 0, 1.5,
   'Purchase of a new commercial-grade stove and food warmer to increase daily capacity.',
   'market_stall', 'walk_in', 'average_monthly_last_3_months', 'partially_documented', 'reviewed'),
  -- Elena Lim: Online seller, 3 years, good cash flow
  ('77777777-7777-7777-7777-777777777777', 'Elena Online Shop', 'online_seller',
   'Online reseller of skincare and beauty products via social media and marketplace platforms.',
   'Pasig City', '22 Emerald Avenue, Ortigas Center, Pasig City',
   'San Antonio', 'Pasig City', 'Metro Manila',
   80000, 48000, 0, 3,
   'Bulk purchase of best-selling skincare inventory to take advantage of supplier discount.',
   'home_based', 'online_marketplace', 'average_monthly_last_6_months', 'document_supported', 'reviewed'),
  -- Roberto Cruz: Service provider, new business
  ('88888888-8888-8888-8888-888888888888', 'Cruz Tech Repair', 'service_provider',
   'Mobile phone and gadget repair service with pickup and delivery.',
   'Caloocan City', '77 Rizal Extension, Grace Park, Caloocan City',
   'Grace Park', 'Caloocan City', 'Metro Manila',
   35000, 22000, 0, 0.5,
   'Purchase of diagnostic tools and spare parts to handle more repair jobs per week.',
   'mobile', 'social_media', 'last_30_days', 'self_declared', 'needs_review')
on conflict (borrower_id) do update
set business_name = excluded.business_name, business_type = excluded.business_type,
    business_description = excluded.business_description, location = excluded.location,
    monthly_gross_revenue = excluded.monthly_gross_revenue, monthly_expenses = excluded.monthly_expenses,
    years_in_operation = excluded.years_in_operation, loan_purpose_context = excluded.loan_purpose_context,
    updated_at = now();

-- ============================================================
-- Loan Applications
-- ============================================================
-- Disable credit limit trigger for seeding (it requires auth context)
set session_replication_role = 'replica';

insert into public.loan_applications (
  id, borrower_id, borrower_portfolio_id, requested_amount, purpose,
  preferred_term, status, submitted_at, created_at,
  credit_limit_at_submission, used_credit_at_submission, available_credit_at_submission
)
select
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  bp.id, 15000, 'Restock inventory for peak season sales',
  '1_month', 'accepted', '2026-02-10T08:00:00Z'::timestamptz, '2026-02-10T08:00:00Z'::timestamptz,
  30000, 0, 30000
from public.borrower_portfolios bp
where bp.borrower_id = '11111111-1111-1111-1111-111111111111';

insert into public.loan_applications (
  id, borrower_id, borrower_portfolio_id, requested_amount, purpose,
  preferred_term, status, submitted_at, created_at,
  credit_limit_at_submission, used_credit_at_submission, available_credit_at_submission
)
select
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  bp.id, 25000, 'Purchase new commercial stove and food warmer',
  '3_months', 'accepted', '2026-04-05T09:30:00Z'::timestamptz, '2026-04-05T09:30:00Z'::timestamptz,
  40000, 0, 40000
from public.borrower_portfolios bp
where bp.borrower_id = '22222222-2222-2222-2222-222222222222';

insert into public.loan_applications (
  id, borrower_id, borrower_portfolio_id, requested_amount, purpose,
  preferred_term, status, submitted_at, created_at,
  credit_limit_at_submission, used_credit_at_submission, available_credit_at_submission
)
select
  'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
  '77777777-7777-7777-7777-777777777777'::uuid,
  bp.id, 40000, 'Bulk purchase of skincare inventory at supplier discount',
  '3_months', 'open', '2026-05-20T10:00:00Z'::timestamptz, '2026-05-20T10:00:00Z'::timestamptz,
  55000, 0, 55000
from public.borrower_portfolios bp
where bp.borrower_id = '77777777-7777-7777-7777-777777777777';

insert into public.loan_applications (
  id, borrower_id, borrower_portfolio_id, requested_amount, purpose,
  preferred_term, status, submitted_at, created_at,
  credit_limit_at_submission, used_credit_at_submission, available_credit_at_submission
)
select
  'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  bp.id, 20000, 'Expand product selection with new snack and beverage lines',
  '1_month', 'withdrawn', '2026-05-01T14:00:00Z'::timestamptz, '2026-05-01T14:00:00Z'::timestamptz,
  30000, 0, 30000
from public.borrower_portfolios bp
where bp.borrower_id = '11111111-1111-1111-1111-111111111111';

set session_replication_role = 'origin';

-- ============================================================
-- Loan Offers
-- ============================================================
set session_replication_role = 'replica';

-- Accepted offer: Approved Capital funded Juan's first loan
insert into public.loan_offers (
  id, loan_application_id, borrower_id, lender_id, lender_name,
  approved_amount, repayment_amount, fees, due_date, remarks, status, sent_at
)
values (
  'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a0a0'::uuid,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  '33333333-3333-3333-3333-333333333333'::uuid,
  'Approved Capital',
  15000, 16500, 500, '2026-03-15'::date,
  'Approved for first-time borrower with solid store revenue.', 'accepted',
  '2026-02-11T10:00:00Z'::timestamptz
);

-- Declined offer: Partner Capital also made an offer on Juan's first loan
insert into public.loan_offers (
  id, loan_application_id, borrower_id, lender_id, lender_name,
  approved_amount, repayment_amount, fees, due_date, remarks, status, sent_at
)
values (
  'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'::uuid,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  '44444444-4444-4444-4444-444444444444'::uuid,
  'Partner Capital',
  15000, 17000, 600, '2026-03-15'::date,
  'Competitive offer for established borrower.', 'declined',
  '2026-02-11T14:00:00Z'::timestamptz
);

-- Accepted offer: Partner Capital funded Maria's food stall loan
insert into public.loan_offers (
  id, loan_application_id, borrower_id, lender_id, lender_name,
  approved_amount, repayment_amount, fees, due_date, remarks, status, sent_at
)
values (
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b0'::uuid,
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  '44444444-4444-4444-4444-444444444444'::uuid,
  'Partner Capital',
  25000, 27500, 800, '2026-07-10'::date,
  'Funded for food stall equipment upgrade.', 'accepted',
  '2026-04-06T11:00:00Z'::timestamptz
);

-- Pending offer: Approved Capital on Elena's open application
insert into public.loan_offers (
  id, loan_application_id, borrower_id, lender_id, lender_name,
  approved_amount, repayment_amount, fees, due_date, remarks, status, sent_at
)
values (
  'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c0c0c0'::uuid,
  'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
  '77777777-7777-7777-7777-777777777777'::uuid,
  '33333333-3333-3333-3333-333333333333'::uuid,
  'Approved Capital',
  38000, 41000, 1000, '2026-08-25'::date,
  'Offer for established online seller with strong revenue history.', 'pending',
  '2026-05-22T09:00:00Z'::timestamptz
);

-- Pending offer: Metro Funds on Elena's open application
insert into public.loan_offers (
  id, loan_application_id, borrower_id, lender_id, lender_name,
  approved_amount, repayment_amount, fees, due_date, remarks, status, sent_at
)
values (
  'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1'::uuid,
  'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
  '77777777-7777-7777-7777-777777777777'::uuid,
  '99999999-9999-9999-9999-999999999999'::uuid,
  'Metro Funds',
  40000, 43500, 1200, '2026-08-25'::date,
  'Competitive rate for verified online seller.', 'pending',
  '2026-05-23T15:00:00Z'::timestamptz
);

set session_replication_role = 'origin';

-- ============================================================
-- Active Loans
-- ============================================================

-- Juan's completed loan (fully repaid)
insert into public.active_loans (
  id, loan_application_id, accepted_offer_id, borrower_id, lender_id,
  principal_amount, repayment_amount, fees, outstanding_balance,
  status, started_at, due_date
)
values (
  'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0'::uuid,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a0a0'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  '33333333-3333-3333-3333-333333333333'::uuid,
  15000, 16500, 500, 0,
  'paid', '2026-02-12T00:00:00Z'::timestamptz, '2026-03-15'::date
);

-- Maria's active loan (in progress, 2 of 3 payments done)
insert into public.active_loans (
  id, loan_application_id, accepted_offer_id, borrower_id, lender_id,
  principal_amount, repayment_amount, fees, outstanding_balance,
  status, started_at, due_date
)
values (
  'd1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1'::uuid,
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b0'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  '44444444-4444-4444-4444-444444444444'::uuid,
  25000, 27500, 800, 9166.67,
  'active', '2026-04-07T00:00:00Z'::timestamptz, '2026-07-10'::date
);

-- ============================================================
-- Repayment Schedules
-- ============================================================

-- Juan's loan: single installment, verified
insert into public.loan_repayment_schedules (
  id, active_loan_id, borrower_id, lender_id,
  installment_number, amount_due, due_date, status
)
values (
  'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e0e0e0'::uuid,
  'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  '33333333-3333-3333-3333-333333333333'::uuid,
  1, 16500, '2026-03-12'::date, 'verified'
);

-- Maria's loan: 3 monthly installments
insert into public.loan_repayment_schedules (
  id, active_loan_id, borrower_id, lender_id,
  installment_number, amount_due, due_date, status
)
values
  -- Installment 1: verified
  ('e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1'::uuid,
   'd1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1'::uuid,
   '22222222-2222-2222-2222-222222222222'::uuid,
   '44444444-4444-4444-4444-444444444444'::uuid,
   1, 9166.67, '2026-05-07'::date, 'verified'),
  -- Installment 2: verified
  ('e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2'::uuid,
   'd1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1'::uuid,
   '22222222-2222-2222-2222-222222222222'::uuid,
   '44444444-4444-4444-4444-444444444444'::uuid,
   2, 9166.67, '2026-06-07'::date, 'verified'),
  -- Installment 3: submitted proof, pending verification
  ('e3e3e3e3-e3e3-e3e3-e3e3-e3e3e3e3e3e3'::uuid,
   'd1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1'::uuid,
   '22222222-2222-2222-2222-222222222222'::uuid,
   '44444444-4444-4444-4444-444444444444'::uuid,
   3, 9166.67, '2026-07-07'::date, 'submitted');

-- ============================================================
-- Repayment Proofs
-- ============================================================

-- Juan's verified proof (for completed loan)
insert into public.repayment_proofs (
  id, repayment_schedule_id, active_loan_id, borrower_id, lender_id,
  storage_bucket, storage_path, file_name, file_type, file_size,
  status, submitted_at, reviewed_at, reviewed_by
)
values (
  'f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0'::uuid,
  'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e0e0e0'::uuid,
  'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  '33333333-3333-3333-3333-333333333333'::uuid,
  'repayment-proofs',
  'loans/d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0/schedules/e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e0e0e0/proof.jpg',
  'gcash-receipt-march.jpg', 'image/jpeg', 204800,
  'verified', '2026-03-10T16:00:00Z'::timestamptz,
  '2026-03-11T09:00:00Z'::timestamptz, '33333333-3333-3333-3333-333333333333'::uuid
);

-- Maria's verified proof for installment 1
insert into public.repayment_proofs (
  id, repayment_schedule_id, active_loan_id, borrower_id, lender_id,
  storage_bucket, storage_path, file_name, file_type, file_size,
  status, submitted_at, reviewed_at, reviewed_by
)
values (
  'f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1'::uuid,
  'e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1'::uuid,
  'd1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  '44444444-4444-4444-4444-444444444444'::uuid,
  'repayment-proofs',
  'loans/d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1/schedules/e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1/proof.jpg',
  'bank-transfer-may.jpg', 'image/jpeg', 180200,
  'verified', '2026-05-06T14:00:00Z'::timestamptz,
  '2026-05-06T18:00:00Z'::timestamptz, '44444444-4444-4444-4444-444444444444'::uuid
);

-- Maria's verified proof for installment 2
insert into public.repayment_proofs (
  id, repayment_schedule_id, active_loan_id, borrower_id, lender_id,
  storage_bucket, storage_path, file_name, file_type, file_size,
  status, submitted_at, reviewed_at, reviewed_by
)
values (
  'f2f2f2f2-f2f2-f2f2-f2f2-f2f2f2f2f2f2'::uuid,
  'e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2'::uuid,
  'd1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  '44444444-4444-4444-4444-444444444444'::uuid,
  'repayment-proofs',
  'loans/d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1/schedules/e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2/proof.jpg',
  'gcash-receipt-june.jpg', 'image/jpeg', 195000,
  'verified', '2026-06-05T10:00:00Z'::timestamptz,
  '2026-06-05T16:00:00Z'::timestamptz, '44444444-4444-4444-4444-444444444444'::uuid
);

-- Maria's submitted proof for installment 3 (awaiting verification)
insert into public.repayment_proofs (
  id, repayment_schedule_id, active_loan_id, borrower_id, lender_id,
  storage_bucket, storage_path, file_name, file_type, file_size,
  status, submitted_at, reviewed_at, reviewed_by
)
values (
  'f3f3f3f3-f3f3-f3f3-f3f3-f3f3f3f3f3f3'::uuid,
  'e3e3e3e3-e3e3-e3e3-e3e3-e3e3e3e3e3e3'::uuid,
  'd1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  '44444444-4444-4444-4444-444444444444'::uuid,
  'repayment-proofs',
  'loans/d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1/schedules/e3e3e3e3-e3e3-e3e3-e3e3-e3e3e3e3e3e3/proof.jpg',
  'bank-transfer-july.jpg', 'image/jpeg', 210500,
  'submitted', '2026-05-30T11:00:00Z'::timestamptz, null, null
);

-- ============================================================
-- Notifications
-- ============================================================

-- Juan: loan lifecycle notifications
insert into public.notifications (user_id, type, title, message, href, read_at, created_at)
values
  ('11111111-1111-1111-1111-111111111111', 'application_submitted',
   'Application submitted', 'Your loan application for ₱15,000 has been submitted and is under review.',
   '/borrower/applications', '2026-02-10T09:00:00Z'::timestamptz, '2026-02-10T08:00:00Z'::timestamptz),
  ('11111111-1111-1111-1111-111111111111', 'offer_received',
   'New loan offer', 'Approved Capital has sent you a loan offer of ₱15,000.',
   '/borrower/applications', '2026-02-11T11:00:00Z'::timestamptz, '2026-02-11T10:00:00Z'::timestamptz),
  ('11111111-1111-1111-1111-111111111111', 'offer_accepted',
   'Offer accepted', 'Your loan of ₱15,000 from Approved Capital has been funded.',
   '/borrower/loans', '2026-02-12T01:00:00Z'::timestamptz, '2026-02-12T00:00:00Z'::timestamptz),
  ('11111111-1111-1111-1111-111111111111', 'repayment_verified',
   'Repayment verified', 'Your repayment of ₱16,500 has been verified. Loan fully paid!',
   '/borrower/loans', null, '2026-03-11T09:00:00Z'::timestamptz),
  ('11111111-1111-1111-1111-111111111111', 'application_submitted',
   'Application submitted', 'Your loan application for ₱20,000 has been submitted.',
   '/borrower/applications', '2026-05-01T15:00:00Z'::timestamptz, '2026-05-01T14:00:00Z'::timestamptz),
  ('11111111-1111-1111-1111-111111111111', 'application_withdrawn',
   'Application withdrawn', 'Your loan application for ₱20,000 has been withdrawn.',
   '/borrower/applications', null, '2026-05-03T10:00:00Z'::timestamptz);

-- Maria: loan lifecycle notifications
insert into public.notifications (user_id, type, title, message, href, read_at, created_at)
values
  ('22222222-2222-2222-2222-222222222222', 'application_submitted',
   'Application submitted', 'Your loan application for ₱25,000 has been submitted.',
   '/borrower/applications', '2026-04-05T10:00:00Z'::timestamptz, '2026-04-05T09:30:00Z'::timestamptz),
  ('22222222-2222-2222-2222-222222222222', 'offer_received',
   'New loan offer', 'Partner Capital has sent you a loan offer of ₱25,000.',
   '/borrower/applications', '2026-04-06T12:00:00Z'::timestamptz, '2026-04-06T11:00:00Z'::timestamptz),
  ('22222222-2222-2222-2222-222222222222', 'offer_accepted',
   'Offer accepted', 'Your loan of ₱25,000 from Partner Capital has been funded.',
   '/borrower/loans', null, '2026-04-07T01:00:00Z'::timestamptz),
  ('22222222-2222-2222-2222-222222222222', 'repayment_verified',
   'Repayment verified', 'Your first installment repayment of ₱9,166.67 has been verified.',
   '/borrower/loans', '2026-05-06T19:00:00Z'::timestamptz, '2026-05-06T18:00:00Z'::timestamptz),
  ('22222222-2222-2222-2222-222222222222', 'repayment_verified',
   'Repayment verified', 'Your second installment repayment of ₱9,166.67 has been verified.',
   '/borrower/loans', null, '2026-06-05T16:00:00Z'::timestamptz),
  ('22222222-2222-2222-2222-222222222222', 'repayment_submitted',
   'Repayment submitted', 'Your third installment proof has been submitted for review.',
   '/borrower/loans', null, '2026-05-30T11:00:00Z'::timestamptz);

-- Elena: application and offer notifications
insert into public.notifications (user_id, type, title, message, href, read_at, created_at)
values
  ('77777777-7777-7777-7777-777777777777', 'application_submitted',
   'Application submitted', 'Your loan application for ₱40,000 has been submitted.',
   '/borrower/applications', '2026-05-20T11:00:00Z'::timestamptz, '2026-05-20T10:00:00Z'::timestamptz),
  ('77777777-7777-7777-7777-777777777777', 'offer_received',
   'New loan offer', 'Approved Capital has sent you a loan offer of ₱38,000.',
   '/borrower/applications', null, '2026-05-22T09:00:00Z'::timestamptz),
  ('77777777-7777-7777-7777-777777777777', 'offer_received',
   'New loan offer', 'Metro Funds has sent you a loan offer of ₱40,000.',
   '/borrower/applications', null, '2026-05-23T15:00:00Z'::timestamptz);

-- Lender notifications
insert into public.notifications (user_id, type, title, message, href, read_at, created_at)
values
  ('33333333-3333-3333-3333-333333333333', 'offer_accepted',
   'Offer accepted', 'Borrower One accepted your loan offer of ₱15,000. Loan is now active.',
   '/lender/loans', '2026-02-12T02:00:00Z'::timestamptz, '2026-02-12T01:00:00Z'::timestamptz),
  ('44444444-4444-4444-4444-444444444444', 'offer_declined',
   'Offer declined', 'Your loan offer of ₱15,000 to Borrower One was declined.',
   '/lender/applications', '2026-02-13T08:00:00Z'::timestamptz, '2026-02-12T01:00:00Z'::timestamptz),
  ('44444444-4444-4444-4444-444444444444', 'offer_accepted',
   'Offer accepted', 'Borrower Two accepted your loan offer of ₱25,000. Loan is now active.',
   '/lender/loans', null, '2026-04-07T01:00:00Z'::timestamptz),
  ('33333333-3333-3333-3333-333333333333', 'repayment_submitted',
   'Repayment proof submitted', 'Borrower One submitted repayment proof for review.',
   '/lender/loans', '2026-03-10T17:00:00Z'::timestamptz, '2026-03-10T16:00:00Z'::timestamptz),
  ('44444444-4444-4444-4444-444444444444', 'repayment_submitted',
   'Repayment proof submitted', 'Borrower Two submitted third installment proof for review.',
   '/lender/loans', null, '2026-05-30T11:00:00Z'::timestamptz);

-- Manager notifications
insert into public.notifications (user_id, type, title, message, href, read_at, created_at)
values
  ('66666666-6666-6666-6666-666666666666', 'verification_submitted',
   'Verification submitted', 'Roberto Cruz has submitted verification documents for review.',
   '/manager/borrower-verifications', null, '2026-04-16T08:00:00Z'::timestamptz),
  ('66666666-6666-6666-6666-666666666666', 'lender_signup',
   'New lender signup', 'Metro Funds has registered as a new lender and is pending review.',
   '/manager/lenders', '2026-05-01T09:00:00Z'::timestamptz, '2026-05-01T08:00:00Z'::timestamptz);

-- ============================================================
-- Audit Logs
-- ============================================================
insert into public.audit_logs (actor_id, action, target_table, target_id, metadata, created_at)
values
  -- Juan's loan lifecycle
  ('11111111-1111-1111-1111-111111111111', 'application_submitted', 'loan_applications', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '{"amount": 15000, "term": "1_month"}'::jsonb, '2026-02-10T08:00:00Z'::timestamptz),
  ('33333333-3333-3333-3333-333333333333', 'offer_created', 'loan_offers', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a0a0',
   '{"approved_amount": 15000, "repayment_amount": 16500}'::jsonb, '2026-02-11T10:00:00Z'::timestamptz),
  ('44444444-4444-4444-4444-444444444444', 'offer_created', 'loan_offers', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
   '{"approved_amount": 15000, "repayment_amount": 17000}'::jsonb, '2026-02-11T14:00:00Z'::timestamptz),
  ('11111111-1111-1111-1111-111111111111', 'offer_accepted', 'loan_offers', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a0a0',
   '{"lender": "Approved Capital"}'::jsonb, '2026-02-12T00:00:00Z'::timestamptz),
  ('33333333-3333-3333-3333-333333333333', 'repayment_verified', 'loan_repayment_schedules', 'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e0e0e0',
   '{"amount": 16500, "installment": 1}'::jsonb, '2026-03-11T09:00:00Z'::timestamptz),
  -- Maria's loan lifecycle
  ('22222222-2222-2222-2222-222222222222', 'application_submitted', 'loan_applications', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '{"amount": 25000, "term": "3_months"}'::jsonb, '2026-04-05T09:30:00Z'::timestamptz),
  ('44444444-4444-4444-4444-444444444444', 'offer_created', 'loan_offers', 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b0',
   '{"approved_amount": 25000, "repayment_amount": 27500}'::jsonb, '2026-04-06T11:00:00Z'::timestamptz),
  ('22222222-2222-2222-2222-222222222222', 'offer_accepted', 'loan_offers', 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b0',
   '{"lender": "Partner Capital"}'::jsonb, '2026-04-07T01:00:00Z'::timestamptz),
  ('44444444-4444-4444-4444-444444444444', 'repayment_verified', 'loan_repayment_schedules', 'e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1',
   '{"amount": 9166.67, "installment": 1}'::jsonb, '2026-05-06T18:00:00Z'::timestamptz),
  ('44444444-4444-4444-4444-444444444444', 'repayment_verified', 'loan_repayment_schedules', 'e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2',
   '{"amount": 9166.67, "installment": 2}'::jsonb, '2026-06-05T16:00:00Z'::timestamptz),
  -- Elena's application
  ('77777777-7777-7777-7777-777777777777', 'application_submitted', 'loan_applications', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
   '{"amount": 40000, "term": "3_months"}'::jsonb, '2026-05-20T10:00:00Z'::timestamptz),
  ('33333333-3333-3333-3333-333333333333', 'offer_created', 'loan_offers', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c0c0c0',
   '{"approved_amount": 38000}'::jsonb, '2026-05-22T09:00:00Z'::timestamptz),
  ('99999999-9999-9999-9999-999999999999', 'offer_created', 'loan_offers', 'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1',
   '{"approved_amount": 40000}'::jsonb, '2026-05-23T15:00:00Z'::timestamptz),
  -- Juan's withdrawn application
  ('11111111-1111-1111-1111-111111111111', 'application_withdrawn', 'loan_applications', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
   '{"reason": "No longer needed"}'::jsonb, '2026-05-03T10:00:00Z'::timestamptz),
  -- Manager actions
  ('66666666-6666-6666-6666-666666666666', 'lender_approved', 'lender_profiles', '99999999-9999-9999-9999-999999999999',
   '{"organization": "Metro Funds"}'::jsonb, '2026-05-02T00:00:00Z'::timestamptz),
  ('66666666-6666-6666-6666-666666666666', 'verification_approved', 'borrower_verifications', (
    select id from public.borrower_verifications where borrower_id = '77777777-7777-7777-7777-777777777777'
  ), '{"borrower": "Elena Lim"}'::jsonb, '2026-03-17T00:00:00Z'::timestamptz);
