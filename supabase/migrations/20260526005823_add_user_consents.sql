do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_consent_type') then
    create type public.user_consent_type as enum (
      'terms_of_service',
      'privacy_notice',
      'credit_review_authorization',
      'document_processing_consent',
      'lender_review_consent'
    );
  end if;
end $$;

create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  consent_type public.user_consent_type not null,
  version text not null,
  accepted_at timestamptz not null default now(),
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint user_consents_version_valid
    check (char_length(btrim(version)) between 1 and 80),
  constraint user_consents_user_agent_length
    check (user_agent is null or char_length(user_agent) <= 500)
);

create unique index if not exists user_consents_user_type_version_unique_idx
  on public.user_consents (user_id, consent_type, version);

create index if not exists user_consents_user_accepted_idx
  on public.user_consents (user_id, accepted_at desc);

create index if not exists user_consents_type_version_idx
  on public.user_consents (consent_type, version);

alter table public.user_consents enable row level security;

drop policy if exists "user_consents_select_own" on public.user_consents;
drop policy if exists "user_consents_manager_select_all" on public.user_consents;

create policy "user_consents_select_own"
  on public.user_consents for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_consents_manager_select_all"
  on public.user_consents for select
  to authenticated
  using (app_private.is_manager((select auth.uid())));

revoke insert, update, delete on public.user_consents from anon;
revoke insert, update, delete on public.user_consents from authenticated;

create or replace function app_private.has_current_user_consents(
  p_user_id uuid,
  p_required jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_required_count integer;
  v_matched_count integer;
begin
  if p_user_id is null
    or p_required is null
    or jsonb_typeof(p_required) <> 'array'
  then
    return false;
  end if;

  select count(*)
  into v_required_count
  from jsonb_array_elements(p_required) as required
  where required ? 'consent_type'
    and required ? 'version'
    and nullif(btrim(required->>'version'), '') is not null;

  if v_required_count = 0 then
    return false;
  end if;

  select count(*)
  into v_matched_count
  from jsonb_array_elements(p_required) as required
  where exists (
    select 1
    from public.user_consents consent
    where consent.user_id = p_user_id
      and consent.consent_type = (required->>'consent_type')::public.user_consent_type
      and consent.version = required->>'version'
  );

  return v_matched_count = v_required_count;
exception
  when invalid_text_representation then
    return false;
end;
$$;

create or replace function app_private.borrower_document_upload_required_consents()
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  select jsonb_build_array(
    jsonb_build_object('consent_type', 'terms_of_service', 'version', '2026-05-terms-v1'),
    jsonb_build_object('consent_type', 'privacy_notice', 'version', '2026-05-privacy-v1'),
    jsonb_build_object('consent_type', 'document_processing_consent', 'version', '2026-05-document-processing-v1')
  );
$$;

create or replace function app_private.borrower_loan_application_required_consents()
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  select jsonb_build_array(
    jsonb_build_object('consent_type', 'terms_of_service', 'version', '2026-05-terms-v1'),
    jsonb_build_object('consent_type', 'privacy_notice', 'version', '2026-05-privacy-v1'),
    jsonb_build_object('consent_type', 'credit_review_authorization', 'version', '2026-05-credit-review-v1')
  );
$$;

create or replace function app_private.lender_review_required_consents()
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  select jsonb_build_array(
    jsonb_build_object('consent_type', 'terms_of_service', 'version', '2026-05-terms-v1'),
    jsonb_build_object('consent_type', 'privacy_notice', 'version', '2026-05-privacy-v1'),
    jsonb_build_object('consent_type', 'lender_review_consent', 'version', '2026-05-lender-review-v1')
  );
$$;

create or replace function app_private.has_borrower_document_upload_consents(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app_private.has_current_user_consents(
    p_user_id,
    app_private.borrower_document_upload_required_consents()
  );
$$;

create or replace function app_private.has_borrower_loan_application_consents(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app_private.has_current_user_consents(
    p_user_id,
    app_private.borrower_loan_application_required_consents()
  );
$$;

create or replace function app_private.has_lender_review_consents(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app_private.has_current_user_consents(
    p_user_id,
    app_private.lender_review_required_consents()
  );
$$;

create or replace function app_private.accept_user_consents(
  p_consents jsonb,
  p_ip_address inet default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_accepted_count integer := 0;
  v_consent_types text[];
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  if not exists (select 1 from public.profiles where id = v_actor_id) then
    return jsonb_build_object(
      'ok', false,
      'message', 'Your account does not have access to this workspace.'
    );
  end if;

  if p_consents is null or jsonb_typeof(p_consents) <> 'array' then
    return jsonb_build_object(
      'ok', false,
      'message', 'Choose the disclosures to accept.'
    );
  end if;

  if p_user_agent is not null and char_length(p_user_agent) > 500 then
    p_user_agent := left(p_user_agent, 500);
  end if;

  with requested as (
    select distinct
      (item->>'consent_type')::public.user_consent_type as consent_type,
      btrim(item->>'version') as version
    from jsonb_array_elements(p_consents) as item
    where item ? 'consent_type'
      and item ? 'version'
      and nullif(btrim(item->>'version'), '') is not null
      and char_length(btrim(item->>'version')) <= 80
  ),
  inserted as (
    insert into public.user_consents (
      user_id,
      consent_type,
      version,
      ip_address,
      user_agent
    )
    select
      v_actor_id,
      requested.consent_type,
      requested.version,
      p_ip_address,
      p_user_agent
    from requested
    on conflict (user_id, consent_type, version) do nothing
    returning consent_type
  )
  select
    count(*),
    coalesce(array_agg(consent_type::text order by consent_type::text), array[]::text[])
  into v_accepted_count, v_consent_types
  from inserted;

  if coalesce(jsonb_array_length(p_consents), 0) > 0 and v_consent_types is null then
    v_consent_types := array[]::text[];
  end if;

  perform app_private.write_audit_log(
    'user_consents_accepted',
    'user_consents',
    v_actor_id,
    jsonb_build_object(
      'accepted_count', v_accepted_count,
      'consent_types', to_jsonb(v_consent_types)
    )
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Required disclosures accepted.',
    'accepted_count', v_accepted_count,
    'consent_types', to_jsonb(v_consent_types)
  );
exception
  when invalid_text_representation then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not accept these disclosures.'
    );
  when check_violation then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not accept these disclosures.'
    );
end;
$$;

create or replace function public.accept_user_consents(
  p_consents jsonb,
  p_ip_address inet default null,
  p_user_agent text default null
)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.accept_user_consents(
    p_consents,
    p_ip_address,
    p_user_agent
  );
$$;

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
  v_verification public.borrower_verifications%rowtype;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_borrower(v_actor_id) then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not upload verification document.'
    );
  end if;

  if not app_private.has_borrower_document_upload_consents(v_actor_id) then
    return jsonb_build_object(
      'ok', false,
      'code', 'consent_required',
      'message', 'Accept the required disclosures before uploading verification documents.'
    );
  end if;

  if p_file_size <= 0 or p_file_size > 5242880 then
    return jsonb_build_object('ok', false, 'message', 'Upload a file up to 5 MB.');
  end if;

  if p_file_type not in (
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ) then
    return jsonb_build_object(
      'ok', false,
      'message', 'Upload a JPG, PNG, WebP, or PDF file.'
    );
  end if;

  if nullif(btrim(coalesce(p_file_name, '')), '') is null
    or char_length(btrim(p_file_name)) > 240 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not save verification document.'
    );
  end if;

  select *
  into v_verification
  from public.borrower_verifications
  where id = p_borrower_verification_id
  for update;

  if not found or v_verification.borrower_id <> v_actor_id then
    return jsonb_build_object(
      'ok', false,
      'message', 'Borrower verification is unavailable.'
    );
  end if;

  if v_verification.verification_status = 'approved' then
    return jsonb_build_object(
      'ok', false,
      'message', 'This borrower verification is already approved.'
    );
  end if;

  if v_verification.verification_status not in ('pending', 'rejected') then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not upload verification document.'
    );
  end if;

  v_expected_prefix := concat(
    'borrowers/',
    v_actor_id::text,
    '/verification/',
    p_borrower_verification_id::text,
    '/'
  );

  if p_storage_path is null
    or p_storage_path not like v_expected_prefix || '%'
    or p_storage_path like '%//%'
    or char_length(p_storage_path) > 512 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not confirm verification document path.'
    );
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

  if v_verification.verification_status = 'rejected' then
    update public.borrower_verifications
    set
      verification_status = 'pending',
      reviewed_at = null,
      reviewed_by = null,
      rejection_reason = null
    where id = v_verification.id;
  end if;

  perform app_private.write_audit_log(
    'borrower_verification_document_uploaded',
    'borrower_verification_documents',
    v_document_id,
    jsonb_build_object(
      'borrower_id', v_actor_id,
      'borrower_verification_id', p_borrower_verification_id,
      'document_type', p_document_type
    )
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Verification document uploaded.',
    'document_id', v_document_id,
    'borrower_verification_id', p_borrower_verification_id
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not save verification document.'
    );
  when check_violation or foreign_key_violation then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not save verification document.'
    );
end;
$$;

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
  v_available_credit numeric;
  v_credit_limit numeric;
  v_portfolio record;
  v_used_credit numeric;
begin
  if v_actor_id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'auth_required',
      'message', 'Sign in to continue.'
    );
  end if;

  if not app_private.is_borrower(v_actor_id) then
    return jsonb_build_object(
      'ok', false,
      'code', 'not_allowed',
      'message', 'Could not submit application.'
    );
  end if;

  if not app_private.has_borrower_loan_application_consents(v_actor_id) then
    return jsonb_build_object(
      'ok', false,
      'code', 'consent_required',
      'message', 'Accept the required disclosures before submitting a loan application.'
    );
  end if;

  if not app_private.is_verified_borrower(v_actor_id) then
    return jsonb_build_object(
      'ok', false,
      'code', 'borrower_verification_required',
      'message', 'Borrower verification is required before submitting a loan application.'
    );
  end if;

  if p_requested_amount is null
    or p_requested_amount < 1000
    or p_requested_amount > 1000000
  then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_amount',
      'message', 'Review the highlighted fields before submitting.'
    );
  end if;

  if p_purpose is null
    or char_length(btrim(p_purpose)) < 10
    or char_length(btrim(p_purpose)) > 160
  then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_purpose',
      'message', 'Review the highlighted fields before submitting.'
    );
  end if;

  if p_preferred_term is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_term',
      'message', 'Review the highlighted fields before submitting.'
    );
  end if;

  if p_remarks is not null and char_length(btrim(p_remarks)) > 500 then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_remarks',
      'message', 'Review the highlighted fields before submitting.'
    );
  end if;

  perform pg_advisory_xact_lock(hashtext(v_actor_id::text));

  select
    id,
    monthly_gross_revenue,
    monthly_expenses,
    existing_loan_payments,
    years_in_operation
  into v_portfolio
  from public.borrower_portfolios
  where borrower_id = v_actor_id;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'code', 'missing_portfolio',
      'message', 'Save your business profile before submitting an application.'
    );
  end if;

  v_credit_limit := app_private.calculate_borrower_credit_limit(
    v_portfolio.monthly_gross_revenue,
    v_portfolio.monthly_expenses,
    v_portfolio.existing_loan_payments,
    v_portfolio.years_in_operation
  );
  v_used_credit := app_private.calculate_borrower_used_credit(v_actor_id);
  v_available_credit := greatest(0, v_credit_limit - v_used_credit);

  if p_requested_amount > v_available_credit then
    return jsonb_build_object(
      'ok', false,
      'code', 'credit_limit_exceeded',
      'message', 'Requested amount exceeds your available credit.',
      'credit_limit', v_credit_limit,
      'used_credit', v_used_credit,
      'available_credit', v_available_credit
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
    available_credit_at_submission
  )
  values (
    v_actor_id,
    v_portfolio.id,
    round(p_requested_amount, 2),
    btrim(p_purpose),
    p_preferred_term,
    nullif(btrim(coalesce(p_remarks, '')), ''),
    'submitted',
    round(v_credit_limit, 2),
    round(v_used_credit, 2),
    round(v_available_credit, 2)
  )
  returning id, borrower_id, borrower_portfolio_id, requested_amount, purpose,
    preferred_term, remarks, status, submitted_at, created_at, updated_at,
    credit_limit_at_submission, used_credit_at_submission,
    available_credit_at_submission
  into v_application;

  return jsonb_build_object(
    'ok', true,
    'message', 'Application submitted.',
    'application', to_jsonb(v_application),
    'credit_limit', v_credit_limit,
    'used_credit', v_used_credit,
    'available_credit', v_available_credit
  );
exception
  when check_violation then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_application',
      'message', 'Review the highlighted fields before submitting.'
    );
  when not_null_violation then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_application',
      'message', 'Review the highlighted fields before submitting.'
    );
  when raise_exception then
    if sqlerrm = 'Requested amount exceeds your available credit.' then
      return jsonb_build_object(
        'ok', false,
        'code', 'credit_limit_exceeded',
        'message', 'Requested amount exceeds your available credit.'
      );
    end if;

    return jsonb_build_object(
      'ok', false,
      'code', 'missing_portfolio',
      'message', 'Save your business profile before submitting an application.'
    );
end;
$$;

drop policy if exists "loan_applications_insert_own_borrower" on public.loan_applications;
create policy "loan_applications_insert_own_borrower"
  on public.loan_applications for insert
  to authenticated
  with check (
    (select auth.uid()) = borrower_id
    and app_private.is_verified_borrower((select auth.uid()))
    and app_private.has_borrower_loan_application_consents((select auth.uid()))
    and status = 'submitted'
    and app_private.borrower_owns_portfolio(
      borrower_portfolio_id,
      (select auth.uid())
    )
  );

create or replace function app_private.review_lender_verification(
  p_lender_profile_id uuid,
  p_decision text,
  p_manager_review_notes text default null,
  p_rejection_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_lender_profile public.lender_profiles%rowtype;
  v_action text;
  v_notes text := nullif(btrim(coalesce(p_manager_review_notes, '')), '');
  v_rejection_reason text := nullif(btrim(coalesce(p_rejection_reason, '')), '');
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to review lenders.');
  end if;

  if not app_private.is_manager(v_actor_id) then
    return jsonb_build_object('ok', false, 'message', 'Only managers can review lenders.');
  end if;

  if p_decision not in ('approve', 'reject', 'return_to_pending') then
    return jsonb_build_object('ok', false, 'message', 'Choose approve or reject.');
  end if;

  if p_decision = 'reject' and v_rejection_reason is null then
    return jsonb_build_object('ok', false, 'message', 'Rejection reason is required.');
  end if;

  if v_notes is not null and char_length(v_notes) > 1000 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Review notes must be 1000 characters or fewer.'
    );
  end if;

  select *
  into v_lender_profile
  from public.lender_profiles
  where id = p_lender_profile_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Lender profile was not found.');
  end if;

  if v_lender_profile.user_id = v_actor_id then
    return jsonb_build_object(
      'ok', false,
      'message', 'Managers cannot review their own lender profile.'
    );
  end if;

  if p_decision = 'approve'
    and not app_private.has_lender_review_consents(v_lender_profile.user_id)
  then
    return jsonb_build_object(
      'ok', false,
      'code', 'consent_required',
      'message', 'Lender must accept the required disclosures before approval.'
    );
  end if;

  if p_decision = 'approve' then
    update public.lender_profiles
    set
      verification_status = 'approved',
      approved_at = now(),
      approved_by = v_actor_id,
      rejected_at = null,
      rejected_by = null,
      rejection_reason = null,
      manager_review_notes = v_notes,
      updated_at = now()
    where id = p_lender_profile_id
    returning * into v_lender_profile;

    v_action := 'lender_approved';
  elsif p_decision = 'reject' then
    update public.lender_profiles
    set
      verification_status = 'rejected',
      approved_at = null,
      approved_by = null,
      rejected_at = now(),
      rejected_by = v_actor_id,
      rejection_reason = v_rejection_reason,
      manager_review_notes = v_notes,
      updated_at = now()
    where id = p_lender_profile_id
    returning * into v_lender_profile;

    v_action := 'lender_rejected';
  else
    update public.lender_profiles
    set
      verification_status = 'pending',
      approved_at = null,
      approved_by = null,
      rejected_at = null,
      rejected_by = null,
      rejection_reason = null,
      manager_review_notes = v_notes,
      updated_at = now()
    where id = p_lender_profile_id
      and verification_status = 'rejected'
    returning * into v_lender_profile;

    if not found then
      return jsonb_build_object(
        'ok', false,
        'message', 'Only rejected lenders can be returned to pending.'
      );
    end if;

    v_action := 'lender_returned_to_pending';
  end if;

  perform app_private.write_audit_log(
    v_action,
    'lender_profiles',
    v_lender_profile.id,
    jsonb_build_object(
      'user_id', v_lender_profile.user_id,
      'organization_name', v_lender_profile.organization_name,
      'verification_status', v_lender_profile.verification_status,
      'manager_review_notes_present', v_lender_profile.manager_review_notes is not null,
      'rejection_reason_present', v_lender_profile.rejection_reason is not null
    )
  );

  return jsonb_build_object(
    'ok', true,
    'message', case
      when p_decision = 'approve' then 'Lender approved.'
      when p_decision = 'reject' then 'Lender rejected.'
      else 'Lender returned to pending.'
    end,
    'lender_profile_id', v_lender_profile.id,
    'verification_status', v_lender_profile.verification_status
  );
end;
$$;

grant execute on function app_private.has_current_user_consents(uuid, jsonb) to authenticated;
grant execute on function app_private.has_borrower_document_upload_consents(uuid) to authenticated;
grant execute on function app_private.has_borrower_loan_application_consents(uuid) to authenticated;
grant execute on function app_private.has_lender_review_consents(uuid) to authenticated;
grant execute on function app_private.accept_user_consents(jsonb, inet, text) to authenticated;
grant execute on function public.accept_user_consents(jsonb, inet, text) to authenticated;
