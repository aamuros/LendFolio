-- Wire verification decision notifications for borrower and lender reviews.
-- Adds try_create_notification calls to review_borrower_verification and
-- review_lender_verification so affected users receive in-app notifications
-- when their verification status changes.

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
  v_notification_type text;
  v_notification_title text;
  v_notification_message text;
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
    v_notification_type := 'verification_approved';
    v_notification_title := 'Verification approved';
    v_notification_message := 'Your borrower verification has been approved. You can now submit loan applications.';
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
    v_notification_type := 'verification_rejected';
    v_notification_title := 'Verification rejected';
    v_notification_message := 'Your borrower verification was rejected. Please review the feedback and resubmit.';
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
    v_notification_type := 'verification_update';
    v_notification_title := 'Verification needs resubmission';
    v_notification_message := 'Your borrower verification needs additional information. Please review and resubmit.';
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
    v_notification_type := 'verification_update';
    v_notification_title := 'Verification updated';
    v_notification_message := 'Your borrower verification has been returned to pending. You may update your submission.';
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

  perform app_private.try_create_notification(
    p_borrower_id,
    v_notification_type,
    v_notification_title,
    v_notification_message,
    '/borrower?tab=profile'
  );

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
  v_notification_type text;
  v_notification_title text;
  v_notification_message text;
begin
  if v_actor_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Sign in to review lenders.'
    );
  end if;

  if not app_private.is_manager(v_actor_id) then
    return jsonb_build_object(
      'ok', false,
      'message', 'Only managers can review lenders.'
    );
  end if;

  if p_decision not in ('approve', 'reject', 'return_to_pending') then
    return jsonb_build_object(
      'ok', false,
      'message', 'Choose approve or reject.'
    );
  end if;

  if p_decision = 'reject' and v_rejection_reason is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Rejection reason is required.'
    );
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
    return jsonb_build_object(
      'ok', false,
      'message', 'Lender profile was not found.'
    );
  end if;

  if v_lender_profile.user_id = v_actor_id then
    return jsonb_build_object(
      'ok', false,
      'message', 'Managers cannot review their own lender profile.'
    );
  end if;

  if v_lender_profile.verification_status = 'incomplete' then
    return jsonb_build_object(
      'ok', false,
      'message', 'This lender has not completed their profile. Wait for them to submit before reviewing.'
    );
  end if;

  if p_decision = 'approve' then
    if v_lender_profile.verification_status not in ('pending', 'rejected') then
      return jsonb_build_object(
        'ok', false,
        'message', 'Only pending or rejected lenders can be approved.'
      );
    end if;

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
    v_notification_type := 'lender_approved';
    v_notification_title := 'Lender account approved';
    v_notification_message := 'Your lender account has been approved. You can now review applications and send offers.';
  elsif p_decision = 'reject' then
    if v_lender_profile.verification_status not in ('pending', 'rejected') then
      return jsonb_build_object(
        'ok', false,
        'message', 'Only pending or rejected lenders can be rejected.'
      );
    end if;

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
    v_notification_type := 'lender_rejected';
    v_notification_title := 'Lender account rejected';
    v_notification_message := 'Your lender account was rejected. Please review the feedback and update your profile.';
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
    v_notification_type := 'lender_review_update';
    v_notification_title := 'Lender verification updated';
    v_notification_message := 'Your lender verification has been returned to pending for further review.';
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

  perform app_private.try_create_notification(
    v_lender_profile.user_id,
    v_notification_type,
    v_notification_title,
    v_notification_message,
    '/lender'
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
