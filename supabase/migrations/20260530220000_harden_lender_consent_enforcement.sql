-- Restore lender-review consent gate in review_lender_verification.
-- The consent check was introduced in 20260526005823 but lost when the
-- function was replaced in 20260530000000 and 20260530210258.
-- This migration adds the has_lender_review_consents guard back so that
-- managers cannot approve a lender who has not accepted the current
-- required lender-review disclosures.

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
