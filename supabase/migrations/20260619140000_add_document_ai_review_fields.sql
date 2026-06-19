alter table public.borrower_verification_documents
  add column if not exists ai_review_status text not null default 'not_run',
  add column if not exists ai_review_confidence numeric,
  add column if not exists ai_detected_document_type text,
  add column if not exists ai_review_reason text,
  add column if not exists ai_risk_flags text[] not null default '{}'::text[],
  add column if not exists ai_model text,
  add column if not exists ai_reviewed_at timestamptz;

alter table public.lender_verification_documents
  add column if not exists ai_review_status text not null default 'not_run',
  add column if not exists ai_review_confidence numeric,
  add column if not exists ai_detected_document_type text,
  add column if not exists ai_review_reason text,
  add column if not exists ai_risk_flags text[] not null default '{}'::text[],
  add column if not exists ai_model text,
  add column if not exists ai_reviewed_at timestamptz;

alter table public.borrower_verification_documents
  drop constraint if exists borrower_verification_documents_ai_review_status_check,
  add constraint borrower_verification_documents_ai_review_status_check
    check (ai_review_status in ('not_run', 'pass', 'needs_manual_review', 'fail', 'error')),
  drop constraint if exists borrower_verification_documents_ai_review_confidence_check,
  add constraint borrower_verification_documents_ai_review_confidence_check
    check (ai_review_confidence is null or (ai_review_confidence >= 0 and ai_review_confidence <= 1)),
  drop constraint if exists borrower_verification_documents_ai_detected_type_check,
  add constraint borrower_verification_documents_ai_detected_type_check
    check (
      ai_detected_document_type is null
      or ai_detected_document_type in (
        'valid_id',
        'business_proof',
        'address_proof',
        'business_registration',
        'authorization_letter',
        'lending_license',
        'proof_of_address',
        'other',
        'unknown'
      )
    ),
  drop constraint if exists borrower_verification_documents_ai_reason_length,
  add constraint borrower_verification_documents_ai_reason_length
    check (ai_review_reason is null or char_length(ai_review_reason) <= 1000),
  drop constraint if exists borrower_verification_documents_ai_model_length,
  add constraint borrower_verification_documents_ai_model_length
    check (ai_model is null or char_length(ai_model) <= 80),
  drop constraint if exists borrower_verification_documents_ai_risk_flags_count,
  add constraint borrower_verification_documents_ai_risk_flags_count
    check (coalesce(array_length(ai_risk_flags, 1), 0) <= 20);

alter table public.lender_verification_documents
  drop constraint if exists lender_verification_documents_ai_review_status_check,
  add constraint lender_verification_documents_ai_review_status_check
    check (ai_review_status in ('not_run', 'pass', 'needs_manual_review', 'fail', 'error')),
  drop constraint if exists lender_verification_documents_ai_review_confidence_check,
  add constraint lender_verification_documents_ai_review_confidence_check
    check (ai_review_confidence is null or (ai_review_confidence >= 0 and ai_review_confidence <= 1)),
  drop constraint if exists lender_verification_documents_ai_detected_type_check,
  add constraint lender_verification_documents_ai_detected_type_check
    check (
      ai_detected_document_type is null
      or ai_detected_document_type in (
        'valid_id',
        'business_proof',
        'address_proof',
        'business_registration',
        'authorization_letter',
        'lending_license',
        'proof_of_address',
        'other',
        'unknown'
      )
    ),
  drop constraint if exists lender_verification_documents_ai_reason_length,
  add constraint lender_verification_documents_ai_reason_length
    check (ai_review_reason is null or char_length(ai_review_reason) <= 1000),
  drop constraint if exists lender_verification_documents_ai_model_length,
  add constraint lender_verification_documents_ai_model_length
    check (ai_model is null or char_length(ai_model) <= 80),
  drop constraint if exists lender_verification_documents_ai_risk_flags_count,
  add constraint lender_verification_documents_ai_risk_flags_count
    check (coalesce(array_length(ai_risk_flags, 1), 0) <= 20);

drop function if exists public.submit_borrower_verification_document(
  uuid,
  text,
  public.borrower_verification_document_type,
  text,
  text,
  integer
);

drop function if exists app_private.submit_borrower_verification_document(
  uuid,
  text,
  public.borrower_verification_document_type,
  text,
  text,
  integer
);

create or replace function app_private.submit_borrower_verification_document(
  p_borrower_verification_id uuid,
  p_storage_path text,
  p_document_type public.borrower_verification_document_type,
  p_file_name text,
  p_file_type text,
  p_file_size integer,
  p_ai_review_status text default 'not_run',
  p_ai_review_confidence numeric default null,
  p_ai_detected_document_type text default null,
  p_ai_review_reason text default null,
  p_ai_risk_flags text[] default '{}'::text[],
  p_ai_model text default null,
  p_ai_reviewed_at timestamptz default null
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
  v_ai_review_status text := coalesce(nullif(btrim(p_ai_review_status), ''), 'not_run');
  v_ai_review_confidence numeric := case
    when p_ai_review_confidence >= 0 and p_ai_review_confidence <= 1 then p_ai_review_confidence
    else null
  end;
  v_ai_detected_document_type text := case
    when p_ai_detected_document_type in (
      'valid_id',
      'business_proof',
      'address_proof',
      'business_registration',
      'authorization_letter',
      'lending_license',
      'proof_of_address',
      'other',
      'unknown'
    ) then p_ai_detected_document_type
    else null
  end;
  v_ai_review_reason text := nullif(left(btrim(coalesce(p_ai_review_reason, '')), 1000), '');
  v_ai_risk_flags text[] := '{}'::text[];
  v_ai_model text := nullif(left(btrim(coalesce(p_ai_model, '')), 80), '');
  v_ai_reviewed_at timestamptz := null;
begin
  if v_ai_review_status not in ('not_run', 'pass', 'needs_manual_review', 'fail', 'error') then
    v_ai_review_status := 'error';
  end if;

  if p_ai_risk_flags is not null then
    select coalesce(array_agg(left(btrim(flag), 80)), '{}'::text[])
    into v_ai_risk_flags
    from unnest(p_ai_risk_flags) as flag
    where nullif(btrim(flag), '') is not null;
  end if;

  if coalesce(array_length(v_ai_risk_flags, 1), 0) > 20 then
    v_ai_risk_flags := v_ai_risk_flags[1:20];
  end if;

  if v_ai_review_status <> 'not_run' then
    v_ai_reviewed_at := coalesce(p_ai_reviewed_at, now());
  end if;

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
    status,
    ai_review_status,
    ai_review_confidence,
    ai_detected_document_type,
    ai_review_reason,
    ai_risk_flags,
    ai_model,
    ai_reviewed_at
  )
  values (
    p_borrower_verification_id,
    v_actor_id,
    p_storage_path,
    p_document_type,
    btrim(p_file_name),
    p_file_type,
    p_file_size,
    'submitted',
    v_ai_review_status,
    v_ai_review_confidence,
    v_ai_detected_document_type,
    v_ai_review_reason,
    v_ai_risk_flags,
    v_ai_model,
    v_ai_reviewed_at
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
      'verification_status', v_new_status,
      'ai_review_status', v_ai_review_status
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

create or replace function public.submit_borrower_verification_document(
  p_borrower_verification_id uuid,
  p_storage_path text,
  p_document_type public.borrower_verification_document_type,
  p_file_name text,
  p_file_type text,
  p_file_size integer,
  p_ai_review_status text default 'not_run',
  p_ai_review_confidence numeric default null,
  p_ai_detected_document_type text default null,
  p_ai_review_reason text default null,
  p_ai_risk_flags text[] default '{}'::text[],
  p_ai_model text default null,
  p_ai_reviewed_at timestamptz default null
)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.submit_borrower_verification_document(
    p_borrower_verification_id,
    p_storage_path,
    p_document_type,
    p_file_name,
    p_file_type,
    p_file_size,
    p_ai_review_status,
    p_ai_review_confidence,
    p_ai_detected_document_type,
    p_ai_review_reason,
    p_ai_risk_flags,
    p_ai_model,
    p_ai_reviewed_at
  );
$$;

drop function if exists public.submit_lender_verification_document(
  uuid,
  text,
  public.lender_verification_document_type,
  text,
  text,
  integer
);

drop function if exists app_private.submit_lender_verification_document(
  uuid,
  text,
  public.lender_verification_document_type,
  text,
  text,
  integer
);

create or replace function app_private.submit_lender_verification_document(
  p_lender_profile_id uuid,
  p_storage_path text,
  p_document_type public.lender_verification_document_type,
  p_file_name text,
  p_file_type text,
  p_file_size integer,
  p_ai_review_status text default 'not_run',
  p_ai_review_confidence numeric default null,
  p_ai_detected_document_type text default null,
  p_ai_review_reason text default null,
  p_ai_risk_flags text[] default '{}'::text[],
  p_ai_model text default null,
  p_ai_reviewed_at timestamptz default null
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
  v_profile public.lender_profiles%rowtype;
  v_ai_review_status text := coalesce(nullif(btrim(p_ai_review_status), ''), 'not_run');
  v_ai_review_confidence numeric := case
    when p_ai_review_confidence >= 0 and p_ai_review_confidence <= 1 then p_ai_review_confidence
    else null
  end;
  v_ai_detected_document_type text := case
    when p_ai_detected_document_type in (
      'valid_id',
      'business_proof',
      'address_proof',
      'business_registration',
      'authorization_letter',
      'lending_license',
      'proof_of_address',
      'other',
      'unknown'
    ) then p_ai_detected_document_type
    else null
  end;
  v_ai_review_reason text := nullif(left(btrim(coalesce(p_ai_review_reason, '')), 1000), '');
  v_ai_risk_flags text[] := '{}'::text[];
  v_ai_model text := nullif(left(btrim(coalesce(p_ai_model, '')), 80), '');
  v_ai_reviewed_at timestamptz := null;
begin
  if v_ai_review_status not in ('not_run', 'pass', 'needs_manual_review', 'fail', 'error') then
    v_ai_review_status := 'error';
  end if;

  if p_ai_risk_flags is not null then
    select coalesce(array_agg(left(btrim(flag), 80)), '{}'::text[])
    into v_ai_risk_flags
    from unnest(p_ai_risk_flags) as flag
    where nullif(btrim(flag), '') is not null;
  end if;

  if coalesce(array_length(v_ai_risk_flags, 1), 0) > 20 then
    v_ai_risk_flags := v_ai_risk_flags[1:20];
  end if;

  if v_ai_review_status <> 'not_run' then
    v_ai_reviewed_at := coalesce(p_ai_reviewed_at, now());
  end if;

  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_approved_lender(v_actor_id)
    and not exists (
      select 1 from public.profiles
      where id = v_actor_id and role = 'lender'
    ) then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not upload verification document.'
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
  into v_profile
  from public.lender_profiles
  where id = p_lender_profile_id
    and user_id = v_actor_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'Lender profile is unavailable.'
    );
  end if;

  if v_profile.verification_status = 'approved' then
    return jsonb_build_object(
      'ok', false,
      'message', 'This lender verification is already approved.'
    );
  end if;

  if v_profile.verification_status not in ('incomplete', 'pending', 'rejected') then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not upload verification document.'
    );
  end if;

  v_expected_prefix := concat(
    'lenders/',
    v_actor_id::text,
    '/verification/',
    p_lender_profile_id::text,
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

  insert into public.lender_verification_documents (
    lender_id,
    lender_profile_id,
    storage_path,
    document_type,
    file_name,
    file_type,
    file_size,
    status,
    ai_review_status,
    ai_review_confidence,
    ai_detected_document_type,
    ai_review_reason,
    ai_risk_flags,
    ai_model,
    ai_reviewed_at
  )
  values (
    v_actor_id,
    p_lender_profile_id,
    p_storage_path,
    p_document_type,
    btrim(p_file_name),
    p_file_type,
    p_file_size,
    'submitted',
    v_ai_review_status,
    v_ai_review_confidence,
    v_ai_detected_document_type,
    v_ai_review_reason,
    v_ai_risk_flags,
    v_ai_model,
    v_ai_reviewed_at
  )
  returning id into v_document_id;

  if v_profile.verification_status = 'rejected' then
    update public.lender_profiles
    set
      verification_status = 'pending',
      rejected_at = null,
      rejected_by = null,
      rejection_reason = null,
      updated_at = now()
    where id = v_profile.id
      and verification_status = 'rejected';
  end if;

  perform app_private.write_audit_log(
    'lender_verification_document_uploaded',
    'lender_verification_documents',
    v_document_id,
    jsonb_build_object(
      'lender_id', v_actor_id,
      'lender_profile_id', p_lender_profile_id,
      'document_type', p_document_type,
      'ai_review_status', v_ai_review_status
    )
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Verification document uploaded.',
    'document_id', v_document_id,
    'lender_profile_id', p_lender_profile_id
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

create or replace function public.submit_lender_verification_document(
  p_lender_profile_id uuid,
  p_storage_path text,
  p_document_type public.lender_verification_document_type,
  p_file_name text,
  p_file_type text,
  p_file_size integer,
  p_ai_review_status text default 'not_run',
  p_ai_review_confidence numeric default null,
  p_ai_detected_document_type text default null,
  p_ai_review_reason text default null,
  p_ai_risk_flags text[] default '{}'::text[],
  p_ai_model text default null,
  p_ai_reviewed_at timestamptz default null
)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.submit_lender_verification_document(
    p_lender_profile_id,
    p_storage_path,
    p_document_type,
    p_file_name,
    p_file_type,
    p_file_size,
    p_ai_review_status,
    p_ai_review_confidence,
    p_ai_detected_document_type,
    p_ai_review_reason,
    p_ai_risk_flags,
    p_ai_model,
    p_ai_reviewed_at
  );
$$;

grant execute on function app_private.submit_borrower_verification_document(
  uuid,
  text,
  public.borrower_verification_document_type,
  text,
  text,
  integer,
  text,
  numeric,
  text,
  text,
  text[],
  text,
  timestamptz
) to authenticated;

grant execute on function public.submit_borrower_verification_document(
  uuid,
  text,
  public.borrower_verification_document_type,
  text,
  text,
  integer,
  text,
  numeric,
  text,
  text,
  text[],
  text,
  timestamptz
) to authenticated;

grant execute on function app_private.submit_lender_verification_document(
  uuid,
  text,
  public.lender_verification_document_type,
  text,
  text,
  integer,
  text,
  numeric,
  text,
  text,
  text[],
  text,
  timestamptz
) to authenticated;

grant execute on function public.submit_lender_verification_document(
  uuid,
  text,
  public.lender_verification_document_type,
  text,
  text,
  integer,
  text,
  numeric,
  text,
  text,
  text[],
  text,
  timestamptz
) to authenticated;
