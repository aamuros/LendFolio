alter table public.lender_profiles
  add column if not exists contact_person text,
  add column if not exists phone_number text,
  add column if not exists business_address text,
  add column if not exists operating_area text,
  add column if not exists business_registration_number text,
  add column if not exists min_loan_amount numeric(12, 2),
  add column if not exists max_loan_amount numeric(12, 2),
  add column if not exists typical_repayment_terms text,
  add column if not exists lender_description text,
  add column if not exists manager_review_notes text,
  add column if not exists rejection_reason text,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejected_by uuid references public.profiles (id);

update public.lender_profiles
set
  contact_person = coalesce(contact_person, organization_name || ' Contact'),
  phone_number = coalesce(phone_number, '+63 900 000 0000'),
  business_address = coalesce(business_address, 'MVP lender address on file'),
  operating_area = coalesce(operating_area, 'Metro Manila'),
  min_loan_amount = coalesce(min_loan_amount, 5000),
  max_loan_amount = coalesce(max_loan_amount, 50000),
  typical_repayment_terms = coalesce(typical_repayment_terms, '1 to 6 months'),
  lender_description = coalesce(
    lender_description,
    'Manual-review lender profile migrated for MVP verification.'
  ),
  rejected_at = case
    when verification_status = 'rejected' then coalesce(rejected_at, updated_at)
    else rejected_at
  end,
  rejected_by = case
    when verification_status = 'rejected' then coalesce(rejected_by, approved_by)
    else rejected_by
  end,
  rejection_reason = case
    when verification_status = 'rejected' then coalesce(rejection_reason, 'Rejected before profile-depth migration.')
    else rejection_reason
  end;

alter table public.lender_profiles
  alter column contact_person set not null,
  alter column phone_number set not null,
  alter column business_address set not null,
  alter column operating_area set not null,
  alter column min_loan_amount set not null,
  alter column max_loan_amount set not null,
  alter column typical_repayment_terms set not null,
  alter column lender_description set not null;

alter table public.lender_profiles
  drop constraint if exists lender_profiles_contact_person_length,
  drop constraint if exists lender_profiles_phone_number_length,
  drop constraint if exists lender_profiles_business_address_length,
  drop constraint if exists lender_profiles_operating_area_length,
  drop constraint if exists lender_profiles_business_registration_number_length,
  drop constraint if exists lender_profiles_loan_amounts_valid,
  drop constraint if exists lender_profiles_typical_repayment_terms_length,
  drop constraint if exists lender_profiles_description_length,
  drop constraint if exists lender_profiles_manager_review_notes_length,
  drop constraint if exists lender_profiles_review_state_valid,
  add constraint lender_profiles_contact_person_length
    check (char_length(contact_person) between 2 and 120),
  add constraint lender_profiles_phone_number_length
    check (char_length(phone_number) between 7 and 30),
  add constraint lender_profiles_business_address_length
    check (char_length(business_address) between 5 and 240),
  add constraint lender_profiles_operating_area_length
    check (char_length(operating_area) between 2 and 160),
  add constraint lender_profiles_business_registration_number_length
    check (
      business_registration_number is null
      or char_length(business_registration_number) between 2 and 80
    ),
  add constraint lender_profiles_loan_amounts_valid
    check (
      min_loan_amount > 0
      and max_loan_amount > 0
      and max_loan_amount >= min_loan_amount
    ),
  add constraint lender_profiles_typical_repayment_terms_length
    check (char_length(typical_repayment_terms) between 2 and 240),
  add constraint lender_profiles_description_length
    check (char_length(lender_description) between 20 and 800),
  add constraint lender_profiles_manager_review_notes_length
    check (
      manager_review_notes is null
      or char_length(manager_review_notes) <= 1000
    ),
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
    );

create index if not exists lender_profiles_status_created_idx
  on public.lender_profiles (verification_status, created_at desc);

create index if not exists lender_profiles_rejected_by_idx
  on public.lender_profiles (rejected_by)
  where rejected_by is not null;

create or replace function app_private.provision_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'lendfolio_role', '')), '');
  v_display_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
  v_organization_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'organization_name', '')), '');
  v_contact_person text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'contact_person', '')), '');
  v_phone_number text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone_number', '')), '');
  v_business_address text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'business_address', '')), '');
  v_operating_area text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'operating_area', '')), '');
  v_business_registration_number text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'business_registration_number', '')), '');
  v_min_loan_amount numeric(12, 2);
  v_max_loan_amount numeric(12, 2);
  v_typical_repayment_terms text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'typical_repayment_terms', '')), '');
  v_lender_description text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'lender_description', '')), '');
begin
  if v_role is null then
    return new;
  end if;

  if v_role not in ('borrower', 'lender') then
    raise exception 'Unsupported signup role.'
      using errcode = '23514';
  end if;

  if v_display_name is null or char_length(v_display_name) not between 2 and 120 then
    raise exception 'A valid display name is required.'
      using errcode = '23514';
  end if;

  if v_role = 'lender' then
    if v_organization_name is null
      or char_length(v_organization_name) not between 2 and 160 then
      raise exception 'A valid organization name is required.'
        using errcode = '23514';
    end if;

    if v_contact_person is null or char_length(v_contact_person) not between 2 and 120 then
      raise exception 'A valid contact person is required.'
        using errcode = '23514';
    end if;

    if v_phone_number is null or char_length(v_phone_number) not between 7 and 30 then
      raise exception 'A valid phone number is required.'
        using errcode = '23514';
    end if;

    if v_business_address is null or char_length(v_business_address) not between 5 and 240 then
      raise exception 'A valid business address is required.'
        using errcode = '23514';
    end if;

    if v_operating_area is null or char_length(v_operating_area) not between 2 and 160 then
      raise exception 'A valid operating area is required.'
        using errcode = '23514';
    end if;

    if v_business_registration_number is not null
      and char_length(v_business_registration_number) not between 2 and 80 then
      raise exception 'A valid business registration number is required.'
        using errcode = '23514';
    end if;

    begin
      v_min_loan_amount := (new.raw_user_meta_data ->> 'min_loan_amount')::numeric(12, 2);
      v_max_loan_amount := (new.raw_user_meta_data ->> 'max_loan_amount')::numeric(12, 2);
    exception
      when invalid_text_representation or numeric_value_out_of_range then
        raise exception 'Valid loan amount limits are required.'
          using errcode = '23514';
    end;

    if v_min_loan_amount is null
      or v_max_loan_amount is null
      or v_min_loan_amount <= 0
      or v_max_loan_amount <= 0
      or v_max_loan_amount < v_min_loan_amount then
      raise exception 'Valid loan amount limits are required.'
        using errcode = '23514';
    end if;

    if v_typical_repayment_terms is null
      or char_length(v_typical_repayment_terms) not between 2 and 240 then
      raise exception 'Valid repayment terms are required.'
        using errcode = '23514';
    end if;

    if v_lender_description is null
      or char_length(v_lender_description) not between 20 and 800 then
      raise exception 'A valid lender description is required.'
        using errcode = '23514';
    end if;
  end if;

  insert into public.profiles (
    id,
    role,
    display_name,
    status
  )
  values (
    new.id,
    v_role::public.app_role,
    v_display_name,
    'active'
  )
  on conflict (id) do nothing;

  if v_role = 'lender' then
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
      new.id,
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
      'pending',
      null,
      null,
      null,
      null,
      null,
      null
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop function if exists public.review_lender_verification(uuid, text);
drop function if exists app_private.review_lender_verification(uuid, text);

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
