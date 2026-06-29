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
  v_document_policy jsonb;
  v_document_status public.borrower_verification_document_status := 'submitted';
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

  if v_ai_review_status = 'pass' then
    v_document_status := 'accepted';
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
    reviewed_at,
    reviewed_by,
    review_notes,
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
    v_document_status,
    case when v_document_status = 'accepted' then now() else null end,
    case when v_document_status = 'accepted' then v_actor_id else null end,
    case when v_document_status = 'accepted' then 'Accepted by AI document review.' else null end,
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

  if v_document_status = 'accepted' then
    v_document_policy := app_private.borrower_verification_document_policy(v_actor_id);

    if coalesce((v_document_policy->>'documents_accepted')::boolean, false) then
      update public.borrower_verifications
      set
        verification_status = 'approved',
        submitted_at = coalesce(submitted_at, now()),
        reviewed_at = now(),
        reviewed_by = v_actor_id,
        manager_review_notes = 'Approved by AI document review.',
        rejection_reason = null
      where id = v_verification.id
      returning verification_status into v_new_status;

      perform app_private.write_audit_log(
        'borrower_verification_approved',
        'borrower_verifications',
        v_verification.id,
        jsonb_build_object(
          'borrower_id', v_actor_id,
          'verification_status', v_new_status,
          'document_policy', v_document_policy,
          'review_source', 'ai_document_review'
        )
      );

      if coalesce((app_private.borrower_application_readiness(v_actor_id)->>'application_ready')::boolean, false) then
        perform app_private.write_audit_log(
          'borrower_application_ready',
          'borrower_verifications',
          v_verification.id,
          jsonb_build_object('borrower_id', v_actor_id)
        );
      end if;

      perform app_private.try_create_notification(
        v_actor_id,
        'verification_approved',
        'Borrower verification approved',
        'Your borrower verification has been approved.',
        '/borrower'
      );
    end if;
  end if;

  perform app_private.write_audit_log(
    case
      when v_document_status = 'accepted' then 'borrower_verification_document_accepted'
      else 'borrower_verification_document_uploaded'
    end,
    'borrower_verification_documents',
    v_document_id,
    jsonb_build_object(
      'borrower_id', v_actor_id,
      'borrower_verification_id', p_borrower_verification_id,
      'document_type', p_document_type,
      'document_status', v_document_status,
      'verification_status', v_new_status,
      'ai_review_status', v_ai_review_status,
      'review_source', case when v_document_status = 'accepted' then 'ai_document_review' else 'manual_review' end
    )
  );

  if v_document_status <> 'accepted' then
    perform app_private.try_create_notification(
      profiles.id,
      'verification_document_submitted',
      'Verification document uploaded',
      'A borrower uploaded a verification document for review.',
      '/manager/borrower-verifications'
    )
    from public.profiles
    where profiles.role = 'manager';
  end if;

  return jsonb_build_object(
    'ok', true,
    'message', case
      when v_new_status = 'approved' then 'Borrower verification approved.'
      when v_document_status = 'accepted' then 'Verification document accepted.'
      else 'Verification document uploaded.'
    end,
    'document_id', v_document_id,
    'borrower_verification_id', p_borrower_verification_id,
    'document_status', v_document_status,
    'verification_status', v_new_status
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'duplicate_storage_path', 'message', 'Could not save verification document.');
  when check_violation or foreign_key_violation then
    return jsonb_build_object('ok', false, 'code', 'invalid_document', 'message', 'Could not save verification document.');
end;
$$;
