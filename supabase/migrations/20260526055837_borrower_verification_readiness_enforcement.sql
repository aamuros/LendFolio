
alter table public.borrower_verifications
  alter column verification_status set default 'not_started';

alter table public.borrower_verifications
  drop constraint if exists borrower_verifications_review_state_valid;

update public.borrower_verifications
set
  verification_status = case
    when verification_status = 'pending' then 'pending_documents'::public.borrower_verification_status
    else verification_status
  end,
  submitted_at = case
    when verification_status in ('approved', 'rejected') then coalesce(submitted_at, created_at)
    else submitted_at
  end
where verification_status = 'pending'
  or (
    verification_status in ('approved', 'rejected')
    and submitted_at is null
  );

alter table public.borrower_verifications
  add constraint borrower_verifications_review_state_valid
    check (
      (
        verification_status in ('not_started', 'pending', 'pending_documents')
        and reviewed_at is null
        and reviewed_by is null
        and rejection_reason is null
      )
      or (
        verification_status in ('submitted', 'under_review')
        and submitted_at is not null
        and reviewed_at is null
        and reviewed_by is null
        and rejection_reason is null
      )
      or (
        verification_status = 'approved'
        and submitted_at is not null
        and reviewed_at is not null
        and reviewed_by is not null
        and rejection_reason is null
      )
      or (
        verification_status in ('rejected', 'needs_resubmission')
        and submitted_at is not null
        and reviewed_at is not null
        and reviewed_by is not null
        and nullif(btrim(coalesce(rejection_reason, '')), '') is not null
      )
    );

create or replace function app_private.normalize_borrower_verification_status()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.verification_status = 'pending'
    and new.submitted_at is null
    and new.reviewed_at is null
    and new.reviewed_by is null then
    new.verification_status := 'not_started';
  end if;

  return new;
end;
$$;

drop trigger if exists borrower_verifications_normalize_status
  on public.borrower_verifications;
create trigger borrower_verifications_normalize_status
  before insert or update on public.borrower_verifications
  for each row execute function app_private.normalize_borrower_verification_status();

create or replace function app_private.borrower_required_verification_document_types()
returns public.borrower_verification_document_type[]
language sql
stable
set search_path = public, pg_temp
as $$
  select array[
    'valid_id'::public.borrower_verification_document_type,
    'business_proof'::public.borrower_verification_document_type
  ];
$$;

create or replace function app_private.borrower_verification_document_policy(
  p_borrower_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_verification_id uuid;
  v_required public.borrower_verification_document_type[];
  v_submitted public.borrower_verification_document_type[];
  v_accepted public.borrower_verification_document_type[];
  v_rejected public.borrower_verification_document_type[];
  v_missing public.borrower_verification_document_type[];
begin
  select id
  into v_verification_id
  from public.borrower_verifications
  where borrower_id = p_borrower_id;

  v_required := app_private.borrower_required_verification_document_types();

  select coalesce(array_agg(distinct document_type), array[]::public.borrower_verification_document_type[])
  into v_submitted
  from public.borrower_verification_documents
  where borrower_verification_id = v_verification_id
    and status in ('submitted', 'accepted');

  select coalesce(array_agg(distinct document_type), array[]::public.borrower_verification_document_type[])
  into v_accepted
  from public.borrower_verification_documents
  where borrower_verification_id = v_verification_id
    and status = 'accepted';

  select coalesce(array_agg(distinct document_type), array[]::public.borrower_verification_document_type[])
  into v_rejected
  from public.borrower_verification_documents
  where borrower_verification_id = v_verification_id
    and status = 'rejected';

  select coalesce(array_agg(required_type), array[]::public.borrower_verification_document_type[])
  into v_missing
  from unnest(v_required) as required_type
  where not required_type = any(v_accepted);

  return jsonb_build_object(
    'required_document_types', to_jsonb(v_required),
    'missing_required_document_types', to_jsonb(v_missing),
    'submitted_document_types', to_jsonb(v_submitted),
    'accepted_document_types', to_jsonb(v_accepted),
    'rejected_document_types', to_jsonb(v_rejected),
    'ready_for_manager_review', (
      select bool_and(required_type = any(v_submitted))
      from unnest(v_required) as required_type
    ),
    'documents_accepted', coalesce(cardinality(v_missing) = 0, false)
  );
end;
$$;

create or replace function app_private.has_complete_borrower_profile(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.borrower_portfolios
    where borrower_id = p_user_id
      and business_type is not null
      and char_length(btrim(location)) between 3 and 120
      and monthly_gross_revenue >= 0
      and monthly_expenses >= 0
      and existing_loan_payments >= 0
      and years_in_operation between 0 and 100
      and char_length(btrim(loan_purpose_context)) between 20 and 800
  );
$$;

create or replace function app_private.borrower_application_readiness(
  p_borrower_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles%rowtype;
  v_verification public.borrower_verifications%rowtype;
  v_document_policy jsonb;
  v_codes text[] := array[]::text[];
begin
  select *
  into v_profile
  from public.profiles
  where id = p_borrower_id
    and role = 'borrower';

  if not found then
    return jsonb_build_object(
      'ok', false,
      'application_ready', false,
      'codes', jsonb_build_array('profile_required'),
      'primary_code', 'profile_required',
      'message', 'Complete your borrower profile before applying.'
    );
  end if;

  if v_profile.status <> 'active' then
    v_codes := array_append(
      v_codes,
      case when v_profile.status = 'suspended' then 'suspended' else 'account_not_active' end
    );
  end if;

  if not app_private.has_complete_borrower_profile(p_borrower_id) then
    v_codes := array_append(v_codes, 'profile_required');
  end if;

  if not app_private.has_borrower_loan_application_consents(p_borrower_id) then
    v_codes := array_append(v_codes, 'consent_required');
  end if;

  select *
  into v_verification
  from public.borrower_verifications
  where borrower_id = p_borrower_id;

  if not found or v_verification.verification_status <> 'approved' then
    v_codes := array_append(v_codes, 'borrower_verification_required');
  end if;

  v_document_policy := app_private.borrower_verification_document_policy(p_borrower_id);

  if not coalesce((v_document_policy->>'documents_accepted')::boolean, false) then
    v_codes := array_append(v_codes, 'documents_required');
  end if;

  return jsonb_build_object(
    'ok', cardinality(v_codes) = 0,
    'application_ready', cardinality(v_codes) = 0,
    'codes', to_jsonb(v_codes),
    'primary_code', case when cardinality(v_codes) = 0 then null else v_codes[1] end,
    'profile_complete', app_private.has_complete_borrower_profile(p_borrower_id),
    'account_status', v_profile.status,
    'borrower_verification_status', v_verification.verification_status,
    'document_policy', v_document_policy,
    'message', case
      when cardinality(v_codes) = 0 then 'Application ready.'
      when v_codes[1] = 'profile_required' then 'Save your business profile before submitting an application.'
      when v_codes[1] = 'consent_required' then 'Accept the required disclosures before submitting an application.'
      when v_codes[1] = 'borrower_verification_required' then 'Borrower verification is required before submitting a loan application.'
      when v_codes[1] = 'documents_required' then 'Upload and complete review for the required verification documents.'
      when v_codes[1] = 'suspended' then 'This account is suspended.'
      else 'This account is not active.'
    end
  );
end;
$$;

create or replace function public.get_borrower_application_readiness()
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.borrower_application_readiness(auth.uid());
$$;

create or replace function app_private.is_application_ready_borrower(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (app_private.borrower_application_readiness(p_user_id)->>'application_ready')::boolean,
    false
  );
$$;

create or replace function app_private.is_verified_borrower(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app_private.is_application_ready_borrower(p_user_id);
$$;

create or replace function app_private.refresh_borrower_verification_submission_state(
  p_borrower_verification_id uuid
)
returns public.borrower_verification_status
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_verification public.borrower_verifications%rowtype;
  v_policy jsonb;
  v_new_status public.borrower_verification_status;
begin
  select *
  into v_verification
  from public.borrower_verifications
  where id = p_borrower_verification_id
  for update;

  if not found then
    return null;
  end if;

  if v_verification.verification_status in ('approved', 'rejected', 'needs_resubmission') then
    return v_verification.verification_status;
  end if;

  v_policy := app_private.borrower_verification_document_policy(v_verification.borrower_id);
  v_new_status := case
    when coalesce((v_policy->>'ready_for_manager_review')::boolean, false)
      then 'submitted'::public.borrower_verification_status
    else 'pending_documents'::public.borrower_verification_status
  end;

  update public.borrower_verifications
  set
    verification_status = v_new_status,
    submitted_at = case
      when v_new_status = 'submitted' then coalesce(submitted_at, now())
      else submitted_at
    end
  where id = p_borrower_verification_id;

  if v_new_status = 'submitted'
    and v_verification.verification_status <> 'submitted' then
    perform app_private.write_audit_log(
      'borrower_verification_submitted',
      'borrower_verifications',
      p_borrower_verification_id,
      jsonb_build_object(
        'borrower_id', v_verification.borrower_id,
        'document_policy', v_policy
      )
    );
  end if;

  return v_new_status;
end;
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

create or replace function app_private.review_borrower_verification_document(
  p_document_id uuid,
  p_decision text,
  p_review_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_action text;
  v_document public.borrower_verification_documents%rowtype;
  v_new_status public.borrower_verification_document_status;
  v_notes text := nullif(btrim(coalesce(p_review_notes, '')), '');
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'code', 'auth_required', 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_manager(v_actor_id) then
    return jsonb_build_object('ok', false, 'code', 'not_allowed', 'message', 'Only managers can review verification documents.');
  end if;

  if p_decision not in ('accept', 'reject') then
    return jsonb_build_object('ok', false, 'code', 'invalid_decision', 'message', 'Choose accept or reject.');
  end if;

  if v_notes is not null and char_length(v_notes) > 1000 then
    return jsonb_build_object('ok', false, 'code', 'notes_too_long', 'message', 'Review notes must be 1000 characters or fewer.');
  end if;

  select *
  into v_document
  from public.borrower_verification_documents
  where id = p_document_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'Verification document was not found.');
  end if;

  if v_document.status = 'accepted' then
    return jsonb_build_object('ok', false, 'code', 'accepted_document_immutable', 'message', 'Accepted verification documents cannot be changed.');
  end if;

  v_new_status := case
    when p_decision = 'accept' then 'accepted'::public.borrower_verification_document_status
    else 'rejected'::public.borrower_verification_document_status
  end;
  v_action := case
    when p_decision = 'accept' then 'borrower_verification_document_accepted'
    else 'borrower_verification_document_rejected'
  end;

  update public.borrower_verification_documents
  set
    status = v_new_status,
    reviewed_at = now(),
    reviewed_by = v_actor_id,
    review_notes = v_notes
  where id = p_document_id
  returning * into v_document;

  update public.borrower_verifications
  set
    verification_status = case
      when p_decision = 'reject' then 'needs_resubmission'::public.borrower_verification_status
      when verification_status = 'submitted' then 'under_review'::public.borrower_verification_status
      else verification_status
    end,
    submitted_at = coalesce(submitted_at, now()),
    reviewed_at = case when p_decision = 'reject' then now() else reviewed_at end,
    reviewed_by = case when p_decision = 'reject' then v_actor_id else reviewed_by end,
    rejection_reason = case
      when p_decision = 'reject' then coalesce(v_notes, 'A verification document needs to be resubmitted.')
      else rejection_reason
    end
  where id = v_document.borrower_verification_id;

  perform app_private.write_audit_log(
    v_action,
    'borrower_verification_documents',
    v_document.id,
    jsonb_build_object(
      'borrower_id', v_document.borrower_id,
      'borrower_verification_id', v_document.borrower_verification_id,
      'document_type', v_document.document_type,
      'document_status', v_document.status,
      'review_notes_present', v_document.review_notes is not null
    )
  );

  return jsonb_build_object(
    'ok', true,
    'message', case
      when p_decision = 'accept' then 'Verification document accepted.'
      else 'Verification document rejected.'
    end,
    'document_id', v_document.id,
    'document_status', v_document.status
  );
end;
$$;

create or replace function app_private.review_borrower_verification(
  p_borrower_id uuid,
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
  v_action text;
  v_document_policy jsonb;
  v_notes text := nullif(btrim(coalesce(p_manager_review_notes, '')), '');
  v_rejection_reason text := nullif(btrim(coalesce(p_rejection_reason, '')), '');
  v_verification public.borrower_verifications%rowtype;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'code', 'auth_required', 'message', 'Sign in to review borrowers.');
  end if;

  if not app_private.is_manager(v_actor_id) then
    return jsonb_build_object('ok', false, 'code', 'not_allowed', 'message', 'Only managers can review borrowers.');
  end if;

  if p_decision not in ('approve', 'reject', 'return_to_pending', 'needs_resubmission') then
    return jsonb_build_object('ok', false, 'code', 'invalid_decision', 'message', 'Choose approve, reject, or return to pending.');
  end if;

  if p_borrower_id = v_actor_id then
    return jsonb_build_object('ok', false, 'code', 'not_allowed', 'message', 'Managers cannot review their own borrower verification.');
  end if;

  if p_decision in ('reject', 'needs_resubmission') and v_rejection_reason is null then
    return jsonb_build_object('ok', false, 'code', 'rejection_reason_required', 'message', 'Rejection reason is required.');
  end if;

  if v_notes is not null and char_length(v_notes) > 1000 then
    return jsonb_build_object('ok', false, 'code', 'notes_too_long', 'message', 'Review notes must be 1000 characters or fewer.');
  end if;

  if v_rejection_reason is not null and char_length(v_rejection_reason) > 1000 then
    return jsonb_build_object('ok', false, 'code', 'reason_too_long', 'message', 'Rejection reason must be 1000 characters or fewer.');
  end if;

  insert into public.borrower_verifications (borrower_id, verification_status)
  values (p_borrower_id, 'not_started')
  on conflict (borrower_id) do nothing;

  select *
  into v_verification
  from public.borrower_verifications
  where borrower_id = p_borrower_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'Borrower verification was not found.');
  end if;

  v_document_policy := app_private.borrower_verification_document_policy(p_borrower_id);

  if p_decision = 'approve'
    and not coalesce((v_document_policy->>'documents_accepted')::boolean, false) then
    return jsonb_build_object(
      'ok', false,
      'code', 'documents_required',
      'message', 'Required verification documents must be accepted before approval.',
      'document_policy', v_document_policy
    );
  end if;

  if p_decision = 'approve' then
    update public.borrower_verifications
    set
      verification_status = 'approved',
      submitted_at = coalesce(submitted_at, now()),
      reviewed_at = now(),
      reviewed_by = v_actor_id,
      manager_review_notes = v_notes,
      rejection_reason = null
    where id = v_verification.id
    returning * into v_verification;

    v_action := 'borrower_verification_approved';
  elsif p_decision = 'reject' then
    update public.borrower_verifications
    set
      verification_status = 'rejected',
      submitted_at = coalesce(submitted_at, now()),
      reviewed_at = now(),
      reviewed_by = v_actor_id,
      manager_review_notes = v_notes,
      rejection_reason = v_rejection_reason
    where id = v_verification.id
    returning * into v_verification;

    v_action := 'borrower_verification_rejected';
  elsif p_decision = 'needs_resubmission' then
    update public.borrower_verifications
    set
      verification_status = 'needs_resubmission',
      submitted_at = coalesce(submitted_at, now()),
      reviewed_at = now(),
      reviewed_by = v_actor_id,
      manager_review_notes = v_notes,
      rejection_reason = v_rejection_reason
    where id = v_verification.id
    returning * into v_verification;

    v_action := 'borrower_verification_returned_to_pending';
  else
    update public.borrower_verifications
    set
      verification_status = 'pending_documents',
      reviewed_at = null,
      reviewed_by = null,
      manager_review_notes = v_notes,
      rejection_reason = null
    where id = v_verification.id
    returning * into v_verification;

    v_action := 'borrower_verification_returned_to_pending';
  end if;

  perform app_private.write_audit_log(
    v_action,
    'borrower_verifications',
    v_verification.id,
    jsonb_build_object(
      'borrower_id', v_verification.borrower_id,
      'verification_status', v_verification.verification_status,
      'document_policy', v_document_policy,
      'manager_review_notes_present', v_verification.manager_review_notes is not null,
      'rejection_reason_present', v_verification.rejection_reason is not null
    )
  );

  if p_decision = 'approve'
    and coalesce((app_private.borrower_application_readiness(p_borrower_id)->>'application_ready')::boolean, false) then
    perform app_private.write_audit_log(
      'borrower_application_ready',
      'borrower_verifications',
      v_verification.id,
      jsonb_build_object('borrower_id', v_verification.borrower_id)
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'message', case
      when p_decision = 'approve' then 'Borrower verification approved.'
      when p_decision = 'reject' then 'Borrower verification rejected.'
      when p_decision = 'needs_resubmission' then 'Borrower verification needs resubmission.'
      else 'Borrower verification returned to pending.'
    end,
    'borrower_id', v_verification.borrower_id,
    'borrower_verification_id', v_verification.id,
    'verification_status', v_verification.verification_status
  );
exception
  when check_violation or foreign_key_violation then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'Borrower verification was not found.');
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
  v_readiness jsonb;
  v_used_credit numeric;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'code', 'auth_required', 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_borrower(v_actor_id) then
    return jsonb_build_object('ok', false, 'code', 'not_allowed', 'message', 'Could not submit application.');
  end if;

  v_readiness := app_private.borrower_application_readiness(v_actor_id);

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
    return jsonb_build_object('ok', false, 'code', 'profile_required', 'message', 'Save your business profile before submitting an application.');
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
  when check_violation or not_null_violation then
    return jsonb_build_object('ok', false, 'code', 'invalid_application', 'message', 'Review the highlighted fields before submitting.');
end;
$$;

drop policy if exists "loan_applications_insert_own_borrower" on public.loan_applications;
create policy "loan_applications_insert_own_borrower"
  on public.loan_applications for insert
  to authenticated
  with check (
    (select auth.uid()) = borrower_id
    and app_private.is_application_ready_borrower((select auth.uid()))
    and status = 'submitted'
    and app_private.borrower_owns_portfolio(
      borrower_portfolio_id,
      (select auth.uid())
    )
  );

drop policy if exists "storage_borrower_verification_documents_borrower_insert"
  on storage.objects;
create policy "storage_borrower_verification_documents_borrower_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'borrower-verification-documents'
    and (storage.foldername(name))[1] = 'borrowers'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and (storage.foldername(name))[3] = 'verification'
    and (storage.foldername(name))[4] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and char_length(storage.filename(name)) > 0
    and app_private.has_borrower_document_upload_consents((select auth.uid()))
    and exists (
      select 1
      from public.borrower_verifications
      where borrower_verifications.id = (storage.foldername(storage.objects.name))[4]::uuid
        and borrower_verifications.borrower_id = (select auth.uid())
        and borrower_verifications.verification_status in (
          'not_started',
          'pending',
          'pending_documents',
          'rejected',
          'needs_resubmission'
        )
    )
  );

grant execute on function app_private.borrower_required_verification_document_types()
  to authenticated;
grant execute on function app_private.borrower_verification_document_policy(uuid)
  to authenticated;
grant execute on function app_private.has_complete_borrower_profile(uuid)
  to authenticated;
grant execute on function app_private.borrower_application_readiness(uuid)
  to authenticated;
grant execute on function public.get_borrower_application_readiness()
  to authenticated;
grant execute on function app_private.is_application_ready_borrower(uuid)
  to authenticated;
grant execute on function app_private.refresh_borrower_verification_submission_state(uuid)
  to authenticated;
