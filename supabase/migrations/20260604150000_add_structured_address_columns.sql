-- Add structured address columns to lender_profiles
alter table public.lender_profiles
  add column if not exists address_region text,
  add column if not exists address_city_or_municipality text,
  add column if not exists address_barangay text,
  add column if not exists address_zip_code text;

-- Add structured address columns to borrower_portfolios
-- (already has barangay, city_or_municipality; add region and zip_code)
alter table public.borrower_portfolios
  add column if not exists region text,
  add column if not exists zip_code text;

-- Add structured address columns to lender_profile_change_requests
alter table public.lender_profile_change_requests
  add column if not exists proposed_address_region text,
  add column if not exists proposed_address_city text,
  add column if not exists proposed_address_barangay text,
  add column if not exists proposed_address_zip_code text;

-- Update submit_lender_onboarding RPC to accept and save structured address
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
  p_lender_description text,
  p_address_region text default null,
  p_address_city text default null,
  p_address_barangay text default null,
  p_address_zip_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_lender_profile public.lender_profiles%rowtype;
  v_previous_status public.lender_verification_status;
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

  v_previous_status := v_lender_profile.verification_status;

  if v_lender_profile.verification_status not in ('incomplete', 'rejected') then
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

  if p_lender_description is not null and char_length(p_lender_description) > 800 then
    return jsonb_build_object('ok', false, 'message', 'Lender description must be 800 characters or fewer.');
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
    lender_description = nullif(btrim(coalesce(p_lender_description, '')), ''),
    address_region = nullif(btrim(coalesce(p_address_region, '')), ''),
    address_city_or_municipality = nullif(btrim(coalesce(p_address_city, '')), ''),
    address_barangay = nullif(btrim(coalesce(p_address_barangay, '')), ''),
    address_zip_code = nullif(btrim(coalesce(p_address_zip_code, '')), ''),
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
      'previous_status', v_previous_status,
      'new_status', 'pending'
    )
  );

  perform app_private.try_create_notification(
    profiles.id,
    'lender_onboarding_submitted',
    'Lender profile submitted',
    'A lender submitted their profile for review.',
    '/manager/lenders?selected=' || v_lender_profile.id::text
  )
  from public.profiles
  where profiles.role = 'manager';

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
  p_lender_description text,
  p_address_region text default null,
  p_address_city text default null,
  p_address_barangay text default null,
  p_address_zip_code text default null
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
    p_lender_description,
    p_address_region,
    p_address_city,
    p_address_barangay,
    p_address_zip_code
  );
$$;

-- Update submit_lender_profile_change_request RPC to accept structured address
create or replace function app_private.submit_lender_profile_change_request(
  p_lender_profile_id uuid,
  p_proposed_organization_name text,
  p_proposed_contact_person text,
  p_proposed_business_address text,
  p_proposed_operating_area text,
  p_proposed_business_registration_number text,
  p_proposed_min_loan_amount numeric,
  p_proposed_max_loan_amount numeric,
  p_proposed_typical_repayment_terms text,
  p_proposed_lender_description text,
  p_proposed_address_region text default null,
  p_proposed_address_city text default null,
  p_proposed_address_barangay text default null,
  p_proposed_address_zip_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_profile public.lender_profiles%rowtype;
  v_request_id uuid;
  v_existing_pending int;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
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
      'message', 'Lender profile was not found.'
    );
  end if;

  if v_profile.verification_status <> 'approved' then
    return jsonb_build_object(
      'ok', false,
      'message', 'Only approved lenders can submit profile change requests.'
    );
  end if;

  select count(*)
  into v_existing_pending
  from public.lender_profile_change_requests
  where lender_id = v_actor_id
    and lender_profile_id = p_lender_profile_id
    and status = 'pending';

  if v_existing_pending > 0 then
    return jsonb_build_object(
      'ok', false,
      'message', 'You already have a pending profile change request. Wait for manager review or cancel it before submitting a new one.'
    );
  end if;

  if p_proposed_organization_name is not null
    and char_length(p_proposed_organization_name) not between 2 and 160 then
    return jsonb_build_object('ok', false, 'message', 'Organization name must be between 2 and 160 characters.');
  end if;

  if p_proposed_contact_person is not null
    and char_length(p_proposed_contact_person) not between 2 and 120 then
    return jsonb_build_object('ok', false, 'message', 'Contact person must be between 2 and 120 characters.');
  end if;

  if p_proposed_business_address is not null
    and char_length(p_proposed_business_address) not between 5 and 240 then
    return jsonb_build_object('ok', false, 'message', 'Business address must be between 5 and 240 characters.');
  end if;

  if p_proposed_operating_area is not null
    and char_length(p_proposed_operating_area) not between 2 and 160 then
    return jsonb_build_object('ok', false, 'message', 'Operating area must be between 2 and 160 characters.');
  end if;

  if p_proposed_business_registration_number is not null
    and char_length(p_proposed_business_registration_number) not between 2 and 80 then
    return jsonb_build_object('ok', false, 'message', 'Business registration number must be between 2 and 80 characters.');
  end if;

  if p_proposed_min_loan_amount is not null and p_proposed_min_loan_amount <= 0 then
    return jsonb_build_object('ok', false, 'message', 'Minimum loan amount must be greater than zero.');
  end if;

  if p_proposed_max_loan_amount is not null and p_proposed_max_loan_amount <= 0 then
    return jsonb_build_object('ok', false, 'message', 'Maximum loan amount must be greater than zero.');
  end if;

  if p_proposed_min_loan_amount is not null
    and p_proposed_max_loan_amount is not null
    and p_proposed_max_loan_amount < p_proposed_min_loan_amount then
    return jsonb_build_object('ok', false, 'message', 'Maximum loan amount must be at least the minimum.');
  end if;

  if p_proposed_typical_repayment_terms is not null
    and char_length(p_proposed_typical_repayment_terms) not between 2 and 240 then
    return jsonb_build_object('ok', false, 'message', 'Repayment terms must be between 2 and 240 characters.');
  end if;

  if p_proposed_lender_description is not null
    and char_length(p_proposed_lender_description) not between 20 and 800 then
    return jsonb_build_object('ok', false, 'message', 'Lender description must be between 20 and 800 characters.');
  end if;

  insert into public.lender_profile_change_requests (
    lender_id,
    lender_profile_id,
    proposed_organization_name,
    proposed_contact_person,
    proposed_business_address,
    proposed_operating_area,
    proposed_business_registration_number,
    proposed_min_loan_amount,
    proposed_max_loan_amount,
    proposed_typical_repayment_terms,
    proposed_lender_description,
    proposed_address_region,
    proposed_address_city,
    proposed_address_barangay,
    proposed_address_zip_code,
    proposed_values,
    status
  )
  values (
    v_actor_id,
    p_lender_profile_id,
    nullif(btrim(coalesce(p_proposed_organization_name, '')), ''),
    nullif(btrim(coalesce(p_proposed_contact_person, '')), ''),
    nullif(btrim(coalesce(p_proposed_business_address, '')), ''),
    nullif(btrim(coalesce(p_proposed_operating_area, '')), ''),
    nullif(btrim(coalesce(p_proposed_business_registration_number, '')), ''),
    p_proposed_min_loan_amount,
    p_proposed_max_loan_amount,
    nullif(btrim(coalesce(p_proposed_typical_repayment_terms, '')), ''),
    nullif(btrim(coalesce(p_proposed_lender_description, '')), ''),
    nullif(btrim(coalesce(p_proposed_address_region, '')), ''),
    nullif(btrim(coalesce(p_proposed_address_city, '')), ''),
    nullif(btrim(coalesce(p_proposed_address_barangay, '')), ''),
    nullif(btrim(coalesce(p_proposed_address_zip_code, '')), ''),
    jsonb_strip_nulls(jsonb_build_object(
      'organization_name', nullif(btrim(coalesce(p_proposed_organization_name, '')), ''),
      'contact_person', nullif(btrim(coalesce(p_proposed_contact_person, '')), ''),
      'business_address', nullif(btrim(coalesce(p_proposed_business_address, '')), ''),
      'operating_area', nullif(btrim(coalesce(p_proposed_operating_area, '')), ''),
      'business_registration_number', nullif(btrim(coalesce(p_proposed_business_registration_number, '')), ''),
      'min_loan_amount', p_proposed_min_loan_amount,
      'max_loan_amount', p_proposed_max_loan_amount,
      'typical_repayment_terms', nullif(btrim(coalesce(p_proposed_typical_repayment_terms, '')), ''),
      'lender_description', nullif(btrim(coalesce(p_proposed_lender_description, '')), ''),
      'address_region', nullif(btrim(coalesce(p_proposed_address_region, '')), ''),
      'address_city', nullif(btrim(coalesce(p_proposed_address_city, '')), ''),
      'address_barangay', nullif(btrim(coalesce(p_proposed_address_barangay, '')), ''),
      'address_zip_code', nullif(btrim(coalesce(p_proposed_address_zip_code, '')), '')
    )),
    'pending'
  )
  returning id into v_request_id;

  perform app_private.write_audit_log(
    'lender_profile_change_request_submitted',
    'lender_profile_change_requests',
    v_request_id,
    jsonb_build_object(
      'lender_id', v_actor_id,
      'lender_profile_id', p_lender_profile_id
    )
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Profile change request submitted.',
    'request_id', v_request_id
  );
exception
  when check_violation then
    return jsonb_build_object(
      'ok', false,
      'message', 'Review the request details before submitting.'
    );
end;
$$;

create or replace function public.submit_lender_profile_change_request(
  p_lender_profile_id uuid,
  p_proposed_organization_name text,
  p_proposed_contact_person text,
  p_proposed_business_address text,
  p_proposed_operating_area text,
  p_proposed_business_registration_number text,
  p_proposed_min_loan_amount numeric,
  p_proposed_max_loan_amount numeric,
  p_proposed_typical_repayment_terms text,
  p_proposed_lender_description text,
  p_proposed_address_region text default null,
  p_proposed_address_city text default null,
  p_proposed_address_barangay text default null,
  p_proposed_address_zip_code text default null
)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.submit_lender_profile_change_request(
    p_lender_profile_id,
    p_proposed_organization_name,
    p_proposed_contact_person,
    p_proposed_business_address,
    p_proposed_operating_area,
    p_proposed_business_registration_number,
    p_proposed_min_loan_amount,
    p_proposed_max_loan_amount,
    p_proposed_typical_repayment_terms,
    p_proposed_lender_description,
    p_proposed_address_region,
    p_proposed_address_city,
    p_proposed_address_barangay,
    p_proposed_address_zip_code
  );
$$;
