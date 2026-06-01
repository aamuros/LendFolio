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
  v_required_types public.lender_verification_document_type[] := array[
    'business_registration'::public.lender_verification_document_type,
    'authorized_representative_id'::public.lender_verification_document_type,
    'authorization_letter'::public.lender_verification_document_type,
    'lending_license'::public.lender_verification_document_type,
    'proof_of_address'::public.lender_verification_document_type
  ];
  v_missing_types text[];
  v_has_all_required boolean;
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
    select array_agg(dt order by dt)
    into v_missing_types
    from unnest(v_required_types) as dt
    where not exists (
      select 1
      from public.lender_verification_documents d
      where d.lender_profile_id = p_lender_profile_id
        and d.document_type = dt
        and d.status = 'accepted'
    );

    v_has_all_required := v_missing_types is null or array_length(v_missing_types, 1) = 0;

    if not v_has_all_required then
      return jsonb_build_object(
        'ok', false,
        'code', 'documents_required',
        'message', 'All required lender documents must be accepted before approval.',
        'missing_document_types', to_jsonb(v_missing_types)
      );
    end if;
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

create or replace function public.review_lender_verification(
  p_lender_profile_id uuid,
  p_decision text,
  p_manager_review_notes text default null,
  p_rejection_reason text default null
)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.review_lender_verification(
    p_lender_profile_id,
    p_decision,
    p_manager_review_notes,
    p_rejection_reason
  );
$$;

create or replace function app_private.trigger_borrower_sensitive_profile_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sensitive_changed boolean := false;
  v_verification_status text;
begin
  if old.business_name is distinct from new.business_name
    or old.business_type is distinct from new.business_type
    or old.business_address is distinct from new.business_address
    or old.location is distinct from new.location
    or old.barangay is distinct from new.barangay
    or old.city_or_municipality is distinct from new.city_or_municipality
    or old.province is distinct from new.province
    or old.operating_model is distinct from new.operating_model
  then
    v_sensitive_changed := true;
  end if;

  if v_sensitive_changed then
    select verification_status
    into v_verification_status
    from public.borrower_verifications
    where borrower_id = new.borrower_id;

    if v_verification_status = 'approved' then
      update public.borrower_verifications
      set
        verification_status = 'needs_resubmission',
        reviewed_at = null,
        reviewed_by = null,
        manager_review_notes = 'Verification requires resubmission due to sensitive profile changes.',
        rejection_reason = null
      where borrower_id = new.borrower_id;

      perform app_private.write_audit_log(
        'borrower_verification_needs_resubmission',
        'borrower_verifications',
        new.borrower_id,
        jsonb_build_object(
          'borrower_id', new.borrower_id,
          'reason', 'sensitive_profile_change'
        )
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists borrower_portfolios_sensitive_change
  on public.borrower_portfolios;
create trigger borrower_portfolios_sensitive_change
  after update on public.borrower_portfolios
  for each row
  execute function app_private.trigger_borrower_sensitive_profile_change();
