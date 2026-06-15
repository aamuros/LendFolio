create or replace function app_private.complete_lender_profile_details(
  p_organization_name text,
  p_contact_person text,
  p_phone_number text,
  p_business_address text,
  p_operating_area text,
  p_business_registration_number text,
  p_min_loan_amount numeric,
  p_max_loan_amount numeric,
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
  v_profile_status public.profile_status;
  v_organization_name text := nullif(btrim(coalesce(p_organization_name, '')), '');
  v_contact_person text := nullif(btrim(coalesce(p_contact_person, '')), '');
  v_phone_number text := nullif(btrim(coalesce(p_phone_number, '')), '');
  v_business_address text := nullif(btrim(coalesce(p_business_address, '')), '');
  v_operating_area text := nullif(btrim(coalesce(p_operating_area, '')), '');
  v_business_registration_number text := nullif(btrim(coalesce(p_business_registration_number, '')), '');
  v_typical_repayment_terms text := nullif(btrim(coalesce(p_typical_repayment_terms, '')), '');
  v_lender_description text := nullif(btrim(coalesce(p_lender_description, '')), '');
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

  select status
  into v_profile_status
  from public.profiles
  where id = v_actor_id;

  if v_profile_status = 'suspended' then
    return jsonb_build_object('ok', false, 'message', 'Your lender account cannot be updated at this time.');
  end if;

  if v_lender_profile.verification_status = 'approved' then
    return jsonb_build_object('ok', false, 'message', 'Approved lender profiles cannot be edited here.');
  end if;

  if v_organization_name is null or char_length(v_organization_name) not between 2 and 160 then
    return jsonb_build_object('ok', false, 'message', 'Organization name is required.');
  end if;

  if v_contact_person is null or char_length(v_contact_person) not between 2 and 120 then
    return jsonb_build_object('ok', false, 'message', 'Contact person is required.');
  end if;

  if v_phone_number is null or char_length(v_phone_number) not between 7 and 30 then
    return jsonb_build_object('ok', false, 'message', 'Phone number is required.');
  end if;

  if v_business_address is null or char_length(v_business_address) > 240 then
    return jsonb_build_object('ok', false, 'message', 'Business address is required.');
  end if;

  if v_operating_area is null or char_length(v_operating_area) not between 2 and 160 then
    return jsonb_build_object('ok', false, 'message', 'Lending area is required.');
  end if;

  if v_business_registration_number is not null and char_length(v_business_registration_number) > 80 then
    return jsonb_build_object('ok', false, 'message', 'Business registration must be 80 characters or fewer.');
  end if;

  if p_min_loan_amount is null
    or p_max_loan_amount is null
    or p_min_loan_amount <= 0
    or p_max_loan_amount < p_min_loan_amount then
    return jsonb_build_object('ok', false, 'message', 'Valid loan amount limits are required.');
  end if;

  if v_typical_repayment_terms is null or char_length(v_typical_repayment_terms) > 120 then
    return jsonb_build_object('ok', false, 'message', 'Typical repayment terms are required.');
  end if;

  if v_lender_description is not null and char_length(v_lender_description) > 800 then
    return jsonb_build_object('ok', false, 'message', 'Lender description must be 800 characters or fewer.');
  end if;

  update public.lender_profiles
  set
    organization_name = v_organization_name,
    contact_person = v_contact_person,
    phone_number = v_phone_number,
    business_address = v_business_address,
    operating_area = v_operating_area,
    business_registration_number = v_business_registration_number,
    min_loan_amount = p_min_loan_amount,
    max_loan_amount = p_max_loan_amount,
    typical_repayment_terms = v_typical_repayment_terms,
    lender_description = v_lender_description,
    address_region = nullif(btrim(coalesce(p_address_region, '')), ''),
    address_city_or_municipality = nullif(btrim(coalesce(p_address_city, '')), ''),
    address_barangay = nullif(btrim(coalesce(p_address_barangay, '')), ''),
    address_zip_code = nullif(btrim(coalesce(p_address_zip_code, '')), ''),
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
    'message', 'Lender details saved.',
    'lender_profile_id', v_lender_profile.id
  );
end;
$$;
