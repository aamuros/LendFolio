-- Wire remaining workflow notifications
-- Adds notifications for: submit_loan_application, withdraw_loan_application,
-- submit_borrower_verification_document, submit_lender_onboarding,
-- and refresh_overdue_repayment_statuses (restored + paid transitions)

-- 1. submit_loan_application: notify all approved lenders
create or replace function app_private.submit_loan_application(
  p_requested_amount numeric,
  p_purpose text,
  p_preferred_term public.preferred_term,
  p_remarks text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_application record;
  v_credit jsonb;
  v_portfolio public.borrower_portfolios%rowtype;
  v_readiness jsonb;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'code', 'auth_required', 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_borrower(v_actor_id) then
    return jsonb_build_object('ok', false, 'code', 'not_allowed', 'message', 'Could not submit application.');
  end if;

  v_readiness := app_private.borrower_application_readiness(v_actor_id);
  perform app_private.write_audit_log(
    'borrower_readiness_evaluated',
    'profiles',
    v_actor_id,
    jsonb_build_object(
      'borrower_id', v_actor_id,
      'readiness_status', v_readiness->>'readiness_status',
      'codes', v_readiness->'codes',
      'risk_flags', v_readiness->'profile_readiness'->'risk_flags'
    )
  );

  if not coalesce((v_readiness->>'application_ready')::boolean, false) then
    return jsonb_build_object(
      'ok', false,
      'code', v_readiness->>'primary_code',
      'codes', v_readiness->'codes',
      'message', v_readiness->>'message',
      'readiness', v_readiness
    );
  end if;

  if p_requested_amount is null
    or p_requested_amount < 1000
    or p_requested_amount > 1000000 then
    return jsonb_build_object('ok', false, 'code', 'invalid_amount', 'message', 'Review the highlighted fields before submitting.');
  end if;

  if p_purpose is null
    or char_length(btrim(p_purpose)) < 10
    or char_length(btrim(p_purpose)) > 160 then
    return jsonb_build_object('ok', false, 'code', 'invalid_purpose', 'message', 'Review the highlighted fields before submitting.');
  end if;

  if p_preferred_term is null then
    return jsonb_build_object('ok', false, 'code', 'invalid_term', 'message', 'Review the highlighted fields before submitting.');
  end if;

  if p_remarks is not null and char_length(btrim(p_remarks)) > 500 then
    return jsonb_build_object('ok', false, 'code', 'invalid_remarks', 'message', 'Review the highlighted fields before submitting.');
  end if;

  perform pg_advisory_xact_lock(hashtext(v_actor_id::text));

  select * into v_portfolio
  from public.borrower_portfolios
  where borrower_id = v_actor_id;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'profile_required', 'message', 'Save your business profile before submitting an application.');
  end if;

  v_credit := app_private.calculate_borrower_credit_limit_details(
    v_portfolio.monthly_gross_revenue,
    v_portfolio.monthly_expenses,
    v_portfolio.existing_loan_payments,
    v_portfolio.years_in_operation,
    v_actor_id
  );

  if p_requested_amount > (v_credit->>'available_credit')::numeric then
    return jsonb_build_object(
      'ok', false,
      'code', 'credit_limit_exceeded',
      'message', 'Requested amount exceeds your available credit.',
      'credit_limit', (v_credit->>'calculated_credit_limit')::numeric,
      'used_credit', (v_credit->>'used_credit')::numeric,
      'available_credit', (v_credit->>'available_credit')::numeric
    );
  end if;

  insert into public.loan_applications (
    borrower_id,
    borrower_portfolio_id,
    requested_amount,
    purpose,
    preferred_term,
    remarks,
    status,
    credit_limit_at_submission,
    used_credit_at_submission,
    available_credit_at_submission,
    monthly_net_cash_flow_at_submission,
    credit_readiness_status,
    borrower_profile_snapshot,
    borrower_readiness_snapshot
  )
  values (
    v_actor_id,
    v_portfolio.id,
    round(p_requested_amount, 2),
    btrim(p_purpose),
    p_preferred_term,
    nullif(btrim(coalesce(p_remarks, '')), ''),
    'submitted',
    round((v_credit->>'calculated_credit_limit')::numeric, 2),
    round((v_credit->>'used_credit')::numeric, 2),
    round((v_credit->>'available_credit')::numeric, 2),
    round((v_credit->>'monthly_net_cash_flow')::numeric, 2),
    'eligible_to_apply',
    to_jsonb(v_portfolio),
    v_readiness
  )
  returning id, borrower_id, borrower_portfolio_id, requested_amount, purpose,
    preferred_term, remarks, status, submitted_at, created_at, updated_at,
    credit_limit_at_submission, used_credit_at_submission,
    available_credit_at_submission, monthly_net_cash_flow_at_submission,
    credit_readiness_status, borrower_profile_snapshot, borrower_readiness_snapshot
  into v_application;

  perform app_private.write_audit_log(
    'loan_application_submitted_with_profile_snapshot',
    'loan_applications',
    v_application.id,
    jsonb_build_object(
      'borrower_id', v_actor_id,
      'credit_readiness_status', v_application.credit_readiness_status,
      'risk_flags', v_readiness->'profile_readiness'->'risk_flags',
      'available_credit', v_application.available_credit_at_submission
    )
  );

  perform app_private.try_create_notification(
    lender_profiles.user_id,
    'application_submitted',
    'New loan application',
    'A borrower submitted a new loan application for review.',
    '/lender/applications/' || v_application.id::text
  )
  from public.lender_profiles
  where lender_profiles.verification_status = 'approved';

  return jsonb_build_object(
    'ok', true,
    'message', 'Application submitted.',
    'application', to_jsonb(v_application),
    'credit_limit', (v_credit->>'calculated_credit_limit')::numeric,
    'used_credit', (v_credit->>'used_credit')::numeric,
    'available_credit', (v_credit->>'available_credit')::numeric
  );
exception
  when check_violation or not_null_violation then
    return jsonb_build_object('ok', false, 'code', 'invalid_application', 'message', 'Review the highlighted fields before submitting.');
end;
$$;

-- 2. withdraw_loan_application: notify lenders whose pending offers are auto-declined
create or replace function app_private.withdraw_loan_application(p_application_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_application record;
  v_declined_count integer := 0;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_borrower(v_actor_id) then
    return jsonb_build_object('ok', false, 'message', 'Could not withdraw application.');
  end if;

  select
    id,
    borrower_id,
    status
  into v_application
  from public.loan_applications
  where id = p_application_id
  for update;

  if not found or v_application.borrower_id <> v_actor_id then
    return jsonb_build_object('ok', false, 'message', 'Could not withdraw application.');
  end if;

  if v_application.status not in ('submitted', 'open') then
    return jsonb_build_object(
      'ok', false,
      'message', 'This application can no longer be withdrawn.'
    );
  end if;

  update public.loan_applications
  set
    status = 'withdrawn',
    updated_at = now()
  where id = p_application_id
  returning id, borrower_id, borrower_portfolio_id, requested_amount, purpose,
    preferred_term, remarks, status, submitted_at, created_at, updated_at
  into v_application;

  update public.loan_offers
  set
    status = 'declined',
    updated_at = now()
  where loan_application_id = p_application_id
    and borrower_id = v_actor_id
    and status = 'pending';

  get diagnostics v_declined_count = row_count;

  perform app_private.write_audit_log(
    'application_withdrawn',
    'loan_applications',
    p_application_id,
    jsonb_build_object('declined_pending_offer_count', v_declined_count)
  );

  perform app_private.try_create_notification(
    loan_offers.lender_id,
    'application_withdrawn',
    'Application withdrawn',
    'A borrower withdrew their loan application. Your pending offer was declined.',
    '/lender/applications/' || p_application_id::text
  )
  from public.loan_offers
  where loan_offers.loan_application_id = p_application_id
    and loan_offers.status = 'declined'
    and loan_offers.updated_at >= now() - interval '5 seconds';

  return jsonb_build_object(
    'ok', true,
    'message', 'Application withdrawn.',
    'application', to_jsonb(v_application)
  );
end;
$$;

create or replace function public.withdraw_loan_application(p_application_id uuid)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.withdraw_loan_application(p_application_id);
$$;

-- 3. submit_borrower_verification_document: notify managers
create or replace function app_private.submit_borrower_verification_document(
  p_borrower_verification_id uuid,
  p_storage_path text,
  p_document_type public.borrower_verification_document_type,
  p_file_name text,
  p_file_type text,
  p_file_size integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_document_id uuid;
  v_expected_prefix text;
  v_new_status public.borrower_verification_status;
  v_verification public.borrower_verifications%rowtype;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'code', 'auth_required', 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_borrower(v_actor_id) then
    return jsonb_build_object('ok', false, 'code', 'not_allowed', 'message', 'Could not upload verification document.');
  end if;

  if not app_private.has_borrower_document_upload_consents(v_actor_id) then
    return jsonb_build_object(
      'ok', false,
      'code', 'consent_required',
      'message', 'Accept the required disclosures before uploading verification documents.'
    );
  end if;

  if p_file_size <= 0 or p_file_size > 5242880 then
    return jsonb_build_object('ok', false, 'code', 'invalid_file_size', 'message', 'Upload a file up to 5 MB.');
  end if;

  if p_file_type not in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf') then
    return jsonb_build_object('ok', false, 'code', 'invalid_file_type', 'message', 'Upload a JPG, PNG, WebP, or PDF file.');
  end if;

  if nullif(btrim(coalesce(p_file_name, '')), '') is null
    or char_length(btrim(p_file_name)) > 240 then
    return jsonb_build_object('ok', false, 'code', 'invalid_file_name', 'message', 'Could not save verification document.');
  end if;

  select *
  into v_verification
  from public.borrower_verifications
  where id = p_borrower_verification_id
  for update;

  if not found or v_verification.borrower_id <> v_actor_id then
    return jsonb_build_object('ok', false, 'code', 'not_allowed', 'message', 'Borrower verification is unavailable.');
  end if;

  if v_verification.verification_status = 'approved' then
    return jsonb_build_object('ok', false, 'code', 'already_approved', 'message', 'This borrower verification is already approved.');
  end if;

  if v_verification.verification_status not in ('not_started', 'pending', 'pending_documents', 'rejected', 'needs_resubmission') then
    return jsonb_build_object('ok', false, 'code', 'not_allowed', 'message', 'Could not upload verification document.');
  end if;

  v_expected_prefix := concat('borrowers/', v_actor_id::text, '/verification/', p_borrower_verification_id::text, '/');

  if p_storage_path is null
    or p_storage_path not like v_expected_prefix || '%'
    or p_storage_path like '%//%'
    or char_length(p_storage_path) > 512 then
    return jsonb_build_object('ok', false, 'code', 'invalid_storage_path', 'message', 'Could not confirm verification document path.');
  end if;

  insert into public.borrower_verification_documents (
    borrower_verification_id,
    borrower_id,
    storage_path,
    document_type,
    file_name,
    file_type,
    file_size,
    status
  )
  values (
    p_borrower_verification_id,
    v_actor_id,
    p_storage_path,
    p_document_type,
    btrim(p_file_name),
    p_file_type,
    p_file_size,
    'submitted'
  )
  returning id into v_document_id;

  update public.borrower_verifications
  set
    verification_status = 'pending_documents',
    reviewed_at = null,
    reviewed_by = null,
    rejection_reason = null
  where id = v_verification.id
    and verification_status in ('not_started', 'pending', 'rejected', 'needs_resubmission');

  v_new_status := app_private.refresh_borrower_verification_submission_state(
    p_borrower_verification_id
  );

  perform app_private.write_audit_log(
    'borrower_verification_document_uploaded',
    'borrower_verification_documents',
    v_document_id,
    jsonb_build_object(
      'borrower_id', v_actor_id,
      'borrower_verification_id', p_borrower_verification_id,
      'document_type', p_document_type,
      'verification_status', v_new_status
    )
  );

  perform app_private.try_create_notification(
    profiles.id,
    'verification_document_submitted',
    'Verification document uploaded',
    'A borrower uploaded a verification document for review.',
    '/manager/borrower-verifications'
  )
  from public.profiles
  where profiles.role = 'manager';

  return jsonb_build_object(
    'ok', true,
    'message', 'Verification document uploaded.',
    'document_id', v_document_id,
    'borrower_verification_id', p_borrower_verification_id,
    'verification_status', v_new_status
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'duplicate_storage_path', 'message', 'Could not save verification document.');
  when check_violation or foreign_key_violation then
    return jsonb_build_object('ok', false, 'code', 'invalid_document', 'message', 'Could not save verification document.');
end;
$$;

-- 4. submit_lender_onboarding: notify managers
create or replace function app_private.submit_lender_onboarding(
  p_organization_name text,
  p_contact_person text,
  p_phone_number text,
  p_business_address text,
  p_operating_area text,
  p_business_registration_number text,
  p_min_loan_amount numeric(12, 2),
  p_max_loan_amount numeric(12, 2),
  p_typical_repayment_terms text,
  p_lender_description text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_lender_profile public.lender_profiles%rowtype;
  v_previous_status public.lender_verification_status;
begin
  if v_actor_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Sign in to complete your lender profile.'
    );
  end if;

  select *
  into v_lender_profile
  from public.lender_profiles
  where user_id = v_actor_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'Lender profile was not found. Contact support for assistance.'
    );
  end if;

  v_previous_status := v_lender_profile.verification_status;

  if v_lender_profile.verification_status not in ('incomplete', 'rejected') then
    return jsonb_build_object(
      'ok', false,
      'message', 'Your lender profile cannot be updated at this time.'
    );
  end if;

  if p_organization_name is null or char_length(p_organization_name) not between 2 and 160 then
    return jsonb_build_object('ok', false, 'message', 'Organization name must be between 2 and 160 characters.');
  end if;

  if p_contact_person is null or char_length(p_contact_person) not between 2 and 120 then
    return jsonb_build_object('ok', false, 'message', 'Contact person must be between 2 and 120 characters.');
  end if;

  if p_phone_number is null or char_length(p_phone_number) not between 7 and 30 then
    return jsonb_build_object('ok', false, 'message', 'Phone number must be between 7 and 30 characters.');
  end if;

  if p_business_address is null or char_length(p_business_address) not between 5 and 240 then
    return jsonb_build_object('ok', false, 'message', 'Business address must be between 5 and 240 characters.');
  end if;

  if p_operating_area is null or char_length(p_operating_area) not between 2 and 160 then
    return jsonb_build_object('ok', false, 'message', 'Operating area must be between 2 and 160 characters.');
  end if;

  if p_business_registration_number is not null
    and char_length(p_business_registration_number) not between 2 and 80 then
    return jsonb_build_object('ok', false, 'message', 'Business registration number must be between 2 and 80 characters.');
  end if;

  if p_min_loan_amount is null
    or p_max_loan_amount is null
    or p_min_loan_amount <= 0
    or p_max_loan_amount <= 0
    or p_max_loan_amount < p_min_loan_amount then
    return jsonb_build_object('ok', false, 'message', 'Valid loan amount limits are required.');
  end if;

  if p_typical_repayment_terms is null or char_length(p_typical_repayment_terms) not between 2 and 240 then
    return jsonb_build_object('ok', false, 'message', 'Repayment terms must be between 2 and 240 characters.');
  end if;

  if p_lender_description is null or char_length(p_lender_description) not between 20 and 800 then
    return jsonb_build_object('ok', false, 'message', 'Lender description must be between 20 and 800 characters.');
  end if;

  update public.lender_profiles
  set
    organization_name = p_organization_name,
    contact_person = p_contact_person,
    phone_number = p_phone_number,
    business_address = p_business_address,
    operating_area = p_operating_area,
    business_registration_number = p_business_registration_number,
    min_loan_amount = p_min_loan_amount,
    max_loan_amount = p_max_loan_amount,
    typical_repayment_terms = p_typical_repayment_terms,
    lender_description = p_lender_description,
    verification_status = 'pending',
    approved_at = null,
    approved_by = null,
    rejected_at = null,
    rejected_by = null,
    rejection_reason = null,
    manager_review_notes = null,
    updated_at = now()
  where id = v_lender_profile.id
  returning * into v_lender_profile;

  perform app_private.write_audit_log(
    'lender_onboarding_submitted',
    'lender_profiles',
    v_lender_profile.id,
    jsonb_build_object(
      'user_id', v_actor_id,
      'organization_name', v_lender_profile.organization_name,
      'previous_status', v_previous_status,
      'new_status', 'pending'
    )
  );

  perform app_private.try_create_notification(
    profiles.id,
    'lender_onboarding_submitted',
    'Lender profile submitted',
    'A lender submitted their profile for review.',
    '/manager/lenders/' || v_lender_profile.id::text
  )
  from public.profiles
  where profiles.role = 'manager';

  return jsonb_build_object(
    'ok', true,
    'message', 'Lender profile submitted for review.',
    'lender_profile_id', v_lender_profile.id,
    'verification_status', 'pending'
  );
end;
$$;

create or replace function public.submit_lender_onboarding(
  p_organization_name text,
  p_contact_person text,
  p_phone_number text,
  p_business_address text,
  p_operating_area text,
  p_business_registration_number text,
  p_min_loan_amount numeric(12, 2),
  p_max_loan_amount numeric(12, 2),
  p_typical_repayment_terms text,
  p_lender_description text
)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.submit_lender_onboarding(
    p_organization_name,
    p_contact_person,
    p_phone_number,
    p_business_address,
    p_operating_area,
    p_business_registration_number,
    p_min_loan_amount,
    p_max_loan_amount,
    p_typical_repayment_terms,
    p_lender_description
  );
$$;

-- 5. refresh_overdue_repayment_statuses: add notifications for restored and paid transitions
create or replace function app_private.refresh_overdue_repayment_statuses()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_late_repayment_count integer := 0;
  v_overdue_loan_count integer := 0;
  v_restored_loan_count integer := 0;
  v_paid_loan_count integer := 0;
begin
  if v_actor_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Sign in to continue.',
      'late_repayment_count', 0,
      'overdue_loan_count', 0,
      'restored_loan_count', 0,
      'paid_loan_count', 0
    );
  end if;

  if not app_private.is_manager(v_actor_id) then
    return jsonb_build_object(
      'ok', false,
      'message', 'Only managers can refresh overdue statuses.',
      'late_repayment_count', 0,
      'overdue_loan_count', 0,
      'restored_loan_count', 0,
      'paid_loan_count', 0
    );
  end if;

  create temporary table overdue_refresh_late_schedules (
    id uuid primary key,
    active_loan_id uuid not null,
    previous_status public.repayment_status not null
  ) on commit drop;

  create temporary table overdue_refresh_overdue_loans (
    id uuid primary key,
    previous_status public.active_loan_status not null
  ) on commit drop;

  create temporary table overdue_refresh_restored_loans (
    id uuid primary key,
    previous_status public.active_loan_status not null,
    borrower_id uuid not null,
    lender_id uuid not null
  ) on commit drop;

  create temporary table overdue_refresh_paid_loans (
    id uuid primary key,
    previous_status public.active_loan_status not null,
    borrower_id uuid not null,
    lender_id uuid not null
  ) on commit drop;

  -- Mark overdue repayments as late
  with target as (
    select id, active_loan_id, status as previous_status
    from public.loan_repayment_schedules
    where due_date < current_date
      and status in ('due', 'rejected')
    for update
  ),
  changed as (
    update public.loan_repayment_schedules
    set
      status = 'late',
      updated_at = now()
    from target
    where loan_repayment_schedules.id = target.id
    returning
      loan_repayment_schedules.id,
      loan_repayment_schedules.active_loan_id,
      target.previous_status
  )
  insert into overdue_refresh_late_schedules (id, active_loan_id, previous_status)
  select id, active_loan_id, previous_status
  from changed;

  get diagnostics v_late_repayment_count = row_count;

  insert into public.audit_logs (actor_id, action, target_table, target_id, metadata)
  select
    v_actor_id,
    'repayment_marked_late',
    'loan_repayment_schedules',
    id,
    jsonb_build_object(
      'active_loan_id', active_loan_id,
      'previous_status', previous_status,
      'new_status', 'late'
    )
  from overdue_refresh_late_schedules;

  perform app_private.try_create_notification(
    loan_repayment_schedules.borrower_id,
    'repayment_late',
    'Repayment is late',
    'A repayment is past due. Upload payment proof when ready.',
    '/borrower?tab=loans&repaymentId=' || overdue_refresh_late_schedules.id::text
  )
  from overdue_refresh_late_schedules
  join public.loan_repayment_schedules
    on loan_repayment_schedules.id = overdue_refresh_late_schedules.id;

  -- Mark active loans as overdue
  with target as (
    select id, status as previous_status
    from public.active_loans
    where status = 'active'
      and exists (
        select 1
        from public.loan_repayment_schedules
        where loan_repayment_schedules.active_loan_id = active_loans.id
          and loan_repayment_schedules.status = 'late'
      )
    for update
  ),
  changed as (
    update public.active_loans
    set
      status = 'overdue',
      updated_at = now()
    from target
    where active_loans.id = target.id
    returning active_loans.id, target.previous_status
  )
  insert into overdue_refresh_overdue_loans (id, previous_status)
  select id, previous_status
  from changed;

  get diagnostics v_overdue_loan_count = row_count;

  insert into public.audit_logs (actor_id, action, target_table, target_id, metadata)
  select
    v_actor_id,
    'loan_marked_overdue',
    'active_loans',
    id,
    jsonb_build_object('previous_status', previous_status, 'new_status', 'overdue')
  from overdue_refresh_overdue_loans;

  perform app_private.try_create_notification(
    active_loans.lender_id,
    'loan_overdue',
    'Loan is overdue',
    'A borrower loan has an overdue repayment.',
    '/lender?tab=offers'
  )
  from overdue_refresh_overdue_loans
  join public.active_loans
    on active_loans.id = overdue_refresh_overdue_loans.id;

  -- Mark loans with all verified repayments and zero balance as paid
  with target as (
    select
      id,
      status as previous_status,
      borrower_id,
      lender_id
    from public.active_loans
    where status <> 'paid'
      and outstanding_balance = 0
      and exists (
        select 1
        from public.loan_repayment_schedules
        where loan_repayment_schedules.active_loan_id = active_loans.id
      )
      and not exists (
        select 1
        from public.loan_repayment_schedules
        where loan_repayment_schedules.active_loan_id = active_loans.id
          and loan_repayment_schedules.status <> 'verified'
      )
    for update
  ),
  changed as (
    update public.active_loans
    set
      status = 'paid',
      updated_at = now()
    from target
    where active_loans.id = target.id
    returning active_loans.id, target.previous_status, target.borrower_id, target.lender_id
  )
  insert into overdue_refresh_paid_loans (id, previous_status, borrower_id, lender_id)
  select id, previous_status, borrower_id, lender_id
  from changed;

  get diagnostics v_paid_loan_count = row_count;

  insert into public.audit_logs (actor_id, action, target_table, target_id, metadata)
  select
    v_actor_id,
    'loan_paid',
    'active_loans',
    id,
    jsonb_build_object('previous_status', previous_status, 'new_status', 'paid')
  from overdue_refresh_paid_loans;

  perform app_private.try_create_notification(
    overdue_refresh_paid_loans.borrower_id,
    'loan_paid',
    'Loan fully paid',
    'Congratulations! Your loan has been fully repaid.',
    '/borrower?tab=loans'
  )
  from overdue_refresh_paid_loans;

  perform app_private.try_create_notification(
    overdue_refresh_paid_loans.lender_id,
    'loan_paid',
    'Loan fully repaid',
    'A borrower has fully repaid their loan.',
    '/lender?tab=offers'
  )
  from overdue_refresh_paid_loans;

  -- Restore overdue loans to active if no more late repayments
  with target as (
    select
      id,
      status as previous_status,
      borrower_id,
      lender_id
    from public.active_loans
    where status = 'overdue'
      and outstanding_balance > 0
      and not exists (
        select 1
        from public.loan_repayment_schedules
        where loan_repayment_schedules.active_loan_id = active_loans.id
          and loan_repayment_schedules.status = 'late'
      )
    for update
  ),
  changed as (
    update public.active_loans
    set
      status = 'active',
      updated_at = now()
    from target
    where active_loans.id = target.id
    returning active_loans.id, target.previous_status, target.borrower_id, target.lender_id
  )
  insert into overdue_refresh_restored_loans (id, previous_status, borrower_id, lender_id)
  select id, previous_status, borrower_id, lender_id
  from changed;

  get diagnostics v_restored_loan_count = row_count;

  insert into public.audit_logs (actor_id, action, target_table, target_id, metadata)
  select
    v_actor_id,
    'loan_restored_active',
    'active_loans',
    id,
    jsonb_build_object('previous_status', previous_status, 'new_status', 'active')
  from overdue_refresh_restored_loans;

  perform app_private.try_create_notification(
    overdue_refresh_restored_loans.borrower_id,
    'loan_restored_active',
    'Loan restored to active',
    'Your overdue loan has been restored to active status.',
    '/borrower?tab=loans'
  )
  from overdue_refresh_restored_loans;

  perform app_private.try_create_notification(
    overdue_refresh_restored_loans.lender_id,
    'loan_restored_active',
    'Loan restored to active',
    'An overdue loan has been restored to active status.',
    '/lender?tab=offers'
  )
  from overdue_refresh_restored_loans;

  return jsonb_build_object(
    'ok', true,
    'message', 'Overdue statuses refreshed.',
    'late_repayment_count', v_late_repayment_count,
    'overdue_loan_count', v_overdue_loan_count,
    'restored_loan_count', v_restored_loan_count,
    'paid_loan_count', v_paid_loan_count
  );
end;
$$;
