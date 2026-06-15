create or replace function app_private.lender_profile_details_complete(
  p_lender_profile public.lender_profiles
)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select
    (nullif(btrim(coalesce(p_lender_profile.contact_person, '')), '') is not null
      or nullif(btrim(coalesce(p_lender_profile.phone_number, '')), '') is not null)
    and nullif(btrim(coalesce(p_lender_profile.operating_area, '')), '') is not null
    and p_lender_profile.min_loan_amount is not null
    and p_lender_profile.max_loan_amount is not null
    and p_lender_profile.min_loan_amount > 0
    and p_lender_profile.max_loan_amount >= p_lender_profile.min_loan_amount;
$$;

create or replace function app_private.complete_lender_profile_details(
  p_contact_person text,
  p_phone_number text,
  p_operating_area text,
  p_min_loan_amount numeric,
  p_max_loan_amount numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_lender_profile public.lender_profiles%rowtype;
  v_contact_person text := nullif(btrim(coalesce(p_contact_person, '')), '');
  v_phone_number text := nullif(btrim(coalesce(p_phone_number, '')), '');
  v_operating_area text := nullif(btrim(coalesce(p_operating_area, '')), '');
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to complete lender details.');
  end if;

  select *
  into v_lender_profile
  from public.lender_profiles
  where user_id = v_actor_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Lender profile was not found.');
  end if;

  if v_lender_profile.verification_status not in ('pending', 'rejected', 'incomplete') then
    return jsonb_build_object('ok', false, 'message', 'Your lender details cannot be updated at this time.');
  end if;

  if v_phone_number is null or char_length(v_phone_number) not between 7 and 30 then
    return jsonb_build_object('ok', false, 'message', 'Phone number is required.');
  end if;

  if v_contact_person is not null and char_length(v_contact_person) > 120 then
    return jsonb_build_object('ok', false, 'message', 'Contact person must be 120 characters or fewer.');
  end if;

  if v_operating_area is null or char_length(v_operating_area) not between 2 and 160 then
    return jsonb_build_object('ok', false, 'message', 'Lending area is required.');
  end if;

  if p_min_loan_amount is null
    or p_max_loan_amount is null
    or p_min_loan_amount <= 0
    or p_max_loan_amount < p_min_loan_amount then
    return jsonb_build_object('ok', false, 'message', 'Valid loan amount limits are required.');
  end if;

  update public.lender_profiles
  set
    contact_person = coalesce(v_contact_person, contact_person),
    phone_number = v_phone_number,
    operating_area = v_operating_area,
    min_loan_amount = p_min_loan_amount,
    max_loan_amount = p_max_loan_amount,
    verification_status = case
      when verification_status = 'incomplete' then 'pending'::public.lender_verification_status
      else verification_status
    end,
    approved_at = null,
    approved_by = null,
    rejected_at = null,
    rejected_by = null,
    rejection_reason = case when verification_status = 'rejected' then null else rejection_reason end,
    updated_at = now()
  where id = v_lender_profile.id
  returning * into v_lender_profile;

  perform app_private.write_audit_log(
    'lender_profile_details_completed',
    'lender_profiles',
    v_lender_profile.id,
    jsonb_build_object(
      'user_id', v_actor_id,
      'verification_status', v_lender_profile.verification_status
    )
  );

  perform app_private.try_create_notification(
    profiles.id,
    'lender_profile_details_completed',
    'Lender details submitted',
    'A lender completed required profile details for review.',
    '/manager/lenders?selected=' || v_lender_profile.id::text
  )
  from public.profiles
  where profiles.role = 'manager';

  return jsonb_build_object(
    'ok', true,
    'message', 'Lender details submitted.',
    'lender_profile_id', v_lender_profile.id
  );
end;
$$;

create or replace function public.complete_lender_profile_details(
  p_contact_person text,
  p_phone_number text,
  p_operating_area text,
  p_min_loan_amount numeric,
  p_max_loan_amount numeric
)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.complete_lender_profile_details(
    p_contact_person,
    p_phone_number,
    p_operating_area,
    p_min_loan_amount,
    p_max_loan_amount
  );
$$;

grant execute on function public.complete_lender_profile_details(text, text, text, numeric, numeric) to authenticated;

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
    return jsonb_build_object('ok', false, 'message', 'Review notes must be 1000 characters or fewer.');
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
    return jsonb_build_object('ok', false, 'message', 'Managers cannot review their own lender profile.');
  end if;

  if v_lender_profile.verification_status = 'incomplete' then
    return jsonb_build_object(
      'ok', false,
      'code', 'profile_details_required',
      'message', 'This lender has not completed their profile. Wait for them to submit before reviewing.'
    );
  end if;

  if p_decision = 'approve'
    and not app_private.lender_profile_details_complete(v_lender_profile)
  then
    return jsonb_build_object(
      'ok', false,
      'code', 'profile_details_required',
      'message', 'Waiting for lender to complete profile details: contact, area, loan range.'
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
      return jsonb_build_object('ok', false, 'message', 'Only pending or rejected lenders can be approved.');
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
      return jsonb_build_object('ok', false, 'message', 'Only pending or rejected lenders can be rejected.');
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
      return jsonb_build_object('ok', false, 'message', 'Only rejected lenders can be returned to pending.');
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
