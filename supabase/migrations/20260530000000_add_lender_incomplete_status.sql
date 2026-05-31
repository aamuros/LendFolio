alter type public.lender_verification_status add value if not exists 'incomplete';

alter table public.lender_profiles
  drop constraint if exists lender_profiles_review_state_valid;

alter table public.lender_profiles
  add constraint lender_profiles_review_state_valid
    check (
      (
        verification_status = 'approved'
        and approved_at is not null
        and approved_by is not null
        and rejected_at is null
        and rejected_by is null
        and rejection_reason is null
      )
      or (
        verification_status = 'rejected'
        and rejected_at is not null
        and rejected_by is not null
        and nullif(btrim(coalesce(rejection_reason, '')), '') is not null
        and approved_at is null
        and approved_by is null
      )
      or (
        verification_status = 'pending'
        and approved_at is null
        and approved_by is null
        and rejected_at is null
        and rejected_by is null
      )
      or (
        verification_status::text = 'incomplete'
        and approved_at is null
        and approved_by is null
        and rejected_at is null
        and rejected_by is null
      )
    );

create or replace function app_private.provision_auth_user(
  p_user auth.users,
  p_source text default 'auth_user_created'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text := nullif(btrim(coalesce(p_user.raw_user_meta_data ->> 'lendfolio_role', '')), '');
  v_display_name text := nullif(btrim(coalesce(p_user.raw_user_meta_data ->> 'display_name', '')), '');
  v_organization_name text := nullif(btrim(coalesce(p_user.raw_user_meta_data ->> 'organization_name', '')), '');
  v_contact_person text := nullif(btrim(coalesce(p_user.raw_user_meta_data ->> 'contact_person', '')), '');
  v_phone_number text := nullif(btrim(coalesce(p_user.raw_user_meta_data ->> 'phone_number', '')), '');
  v_business_address text := nullif(btrim(coalesce(p_user.raw_user_meta_data ->> 'business_address', '')), '');
  v_operating_area text := nullif(btrim(coalesce(p_user.raw_user_meta_data ->> 'operating_area', '')), '');
  v_business_registration_number text := nullif(btrim(coalesce(p_user.raw_user_meta_data ->> 'business_registration_number', '')), '');
  v_min_loan_amount numeric(12, 2);
  v_max_loan_amount numeric(12, 2);
  v_typical_repayment_terms text := nullif(btrim(coalesce(p_user.raw_user_meta_data ->> 'typical_repayment_terms', '')), '');
  v_lender_description text := nullif(btrim(coalesce(p_user.raw_user_meta_data ->> 'lender_description', '')), '');
  v_existing_role public.app_role;
  v_has_full_lender_details boolean;
  v_verification_status text;
  v_message text;
begin
  if not (p_user.raw_user_meta_data ? 'lendfolio_role') then
    return jsonb_build_object(
      'ok', true,
      'message', 'No self-service provisioning metadata found.'
    );
  end if;

  perform app_private.write_provisioning_event(
    p_user.id,
    'attempted',
    v_role,
    p_source,
    'Account provisioning started.',
    jsonb_build_object('email', p_user.email)
  );

  if v_role is null then
    v_message := 'Signup role is required.';
    perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
    return jsonb_build_object('ok', false, 'message', v_message);
  end if;

  if v_role not in ('borrower', 'lender') then
    v_message := 'Unsupported signup role.';
    perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
    return jsonb_build_object('ok', false, 'message', v_message);
  end if;

  if v_display_name is null or char_length(v_display_name) not between 2 and 120 then
    v_message := 'A valid display name is required.';
    perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
    return jsonb_build_object('ok', false, 'message', v_message);
  end if;

  select role
  into v_existing_role
  from public.profiles
  where id = p_user.id;

  if found and v_existing_role::text <> v_role then
    v_message := 'Existing profile role does not match signup metadata.';
    perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
    return jsonb_build_object('ok', false, 'message', v_message);
  end if;

  if v_role = 'lender' then
    if v_organization_name is not null
      and char_length(v_organization_name) not between 2 and 160 then
      v_message := 'Organization name must be between 2 and 160 characters.';
      perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
      return jsonb_build_object('ok', false, 'message', v_message);
    end if;

    begin
      if (p_user.raw_user_meta_data ->> 'min_loan_amount') is not null then
        v_min_loan_amount := (p_user.raw_user_meta_data ->> 'min_loan_amount')::numeric(12, 2);
      end if;
      if (p_user.raw_user_meta_data ->> 'max_loan_amount') is not null then
        v_max_loan_amount := (p_user.raw_user_meta_data ->> 'max_loan_amount')::numeric(12, 2);
      end if;
    exception
      when invalid_text_representation or numeric_value_out_of_range then
        v_message := 'Valid loan amount limits are required.';
        perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
        return jsonb_build_object('ok', false, 'message', v_message);
    end;

    if v_min_loan_amount is not null
      and v_max_loan_amount is not null
      and (v_min_loan_amount <= 0 or v_max_loan_amount <= 0 or v_max_loan_amount < v_min_loan_amount) then
      v_message := 'Valid loan amount limits are required.';
      perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
      return jsonb_build_object('ok', false, 'message', v_message);
    end if;
  end if;

  insert into public.profiles (
    id,
    role,
    display_name,
    status
  )
  values (
    p_user.id,
    v_role::public.app_role,
    v_display_name,
    'active'
  )
  on conflict (id) do nothing;

  if v_role = 'borrower' then
    insert into public.borrower_verifications (
      borrower_id,
      verification_status
    )
    values (
      p_user.id,
      'pending'
    )
    on conflict (borrower_id) do nothing;
  end if;

  if v_role = 'lender' then
    v_has_full_lender_details :=
      v_organization_name is not null
      and v_contact_person is not null
      and v_phone_number is not null
      and v_business_address is not null
      and v_operating_area is not null
      and v_min_loan_amount is not null
      and v_max_loan_amount is not null
      and v_typical_repayment_terms is not null
      and v_lender_description is not null;

    if v_has_full_lender_details then
      v_verification_status := 'pending';
    else
      v_verification_status := 'incomplete';
    end if;

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
    values (
      p_user.id,
      v_organization_name,
      v_contact_person,
      v_phone_number,
      v_business_address,
      v_operating_area,
      v_business_registration_number,
      v_min_loan_amount,
      v_max_loan_amount,
      v_typical_repayment_terms,
      v_lender_description,
      v_verification_status::public.lender_verification_status,
      null,
      null,
      null,
      null,
      null,
      null
    )
    on conflict (user_id) do nothing;
  end if;

  perform app_private.write_provisioning_event(
    p_user.id,
    'succeeded',
    v_role,
    p_source,
    'Account provisioning completed.'
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Account provisioning completed.',
    'user_id', p_user.id,
    'role', v_role
  );
exception
  when others then
    v_message := 'Account provisioning failed.';
    perform app_private.write_provisioning_event(
      p_user.id,
      'failed',
      v_role,
      p_source,
      v_message,
      jsonb_build_object('sqlstate', sqlstate, 'detail', sqlerrm)
    );
    return jsonb_build_object('ok', false, 'message', v_message);
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

  if v_lender_profile.verification_status::text = 'incomplete' then
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

grant execute on function app_private.review_lender_verification(uuid, text, text, text)
  to authenticated;
grant execute on function public.review_lender_verification(uuid, text, text, text)
  to authenticated;

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
  v_message text;
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

  if v_lender_profile.verification_status::text not in ('incomplete', 'rejected') then
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
      'previous_status', v_lender_profile.verification_status,
      'new_status', 'pending'
    )
  );

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

grant execute on function app_private.submit_lender_onboarding(
  text, text, text, text, text, text, numeric, numeric, text, text
) to authenticated;
grant execute on function public.submit_lender_onboarding(
  text, text, text, text, text, text, numeric, numeric, text, text
) to authenticated;

drop view if exists public.account_onboarding_states;
create view public.account_onboarding_states
with (security_invoker = true)
as
select
  profiles.id as user_id,
  profiles.role,
  profiles.status as profile_status,
  borrower_verifications.verification_status as borrower_verification_status,
  lender_profiles.verification_status as lender_verification_status,
  case
    when profiles.role = 'borrower'
      and borrower_verifications.id is not null then 'ready_for_review'
    when profiles.role = 'lender'
      and lender_profiles.id is not null
      and lender_profiles.verification_status::text <> 'incomplete' then 'ready_for_review'
    when profiles.role = 'lender'
      and lender_profiles.id is not null
      and lender_profiles.verification_status::text = 'incomplete' then 'onboarding_incomplete'
    else 'incomplete'
  end as provisioning_state,
  case
    when profiles.role = 'borrower'
      and borrower_verifications.verification_status = 'approved' then 'ready'
    when profiles.role = 'borrower'
      and borrower_verifications.verification_status = 'rejected' then 'borrower_review_rejected'
    when profiles.role = 'borrower' then 'borrower_review_pending'
    when profiles.role = 'lender'
      and lender_profiles.verification_status = 'approved' then 'ready'
    when profiles.role = 'lender'
      and lender_profiles.verification_status = 'rejected' then 'lender_review_rejected'
    when profiles.role = 'lender'
      and lender_profiles.verification_status::text = 'incomplete' then 'lender_onboarding_incomplete'
    when profiles.role = 'lender' then 'lender_review_pending'
    else 'not_applicable'
  end as onboarding_state,
  profiles.created_at,
  profiles.updated_at
from public.profiles
left join public.borrower_verifications
  on borrower_verifications.borrower_id = profiles.id
left join public.lender_profiles
  on lender_profiles.user_id = profiles.id
where profiles.role in ('borrower', 'lender');

grant select on public.account_onboarding_states to authenticated;
