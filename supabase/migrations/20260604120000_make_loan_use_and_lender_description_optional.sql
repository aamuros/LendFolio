-- Make loan_purpose_context optional on borrower_portfolios
alter table public.borrower_portfolios
  alter column loan_purpose_context drop not null;

alter table public.borrower_portfolios
  drop constraint if exists borrower_portfolios_loan_purpose_context_check;

alter table public.borrower_portfolios
  add constraint borrower_portfolios_loan_purpose_context_check
    check (loan_purpose_context is null or char_length(loan_purpose_context) between 0 and 800);

-- Relax lender_profiles lender_description check to allow null (already nullable)
alter table public.lender_profiles
  drop constraint if exists lender_profiles_description_length;

alter table public.lender_profiles
  add constraint lender_profiles_description_length
    check (lender_description is null or char_length(lender_description) between 0 and 800);

-- Relax lender_profile_change_requests proposed_lender_description check
alter table public.lender_profile_change_requests
  drop constraint if exists lender_profile_change_requests_proposed_desc_length;

alter table public.lender_profile_change_requests
  add constraint lender_profile_change_requests_proposed_desc_length
    check (proposed_lender_description is null or char_length(proposed_lender_description) between 0 and 800);

-- Update borrower_profile_readiness to not require loan_purpose_context
create or replace function app_private.borrower_profile_readiness(
  p_borrower_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_portfolio public.borrower_portfolios%rowtype;
  v_credit jsonb;
  v_missing text[] := array[]::text[];
  v_risk_flags text[] := array[]::text[];
  v_status public.borrower_credit_readiness_status;
  v_profile_is_stale boolean := false;
  v_monthly_net_cash_flow numeric := 0;
  v_debt_burden_ratio numeric;
begin
  select * into v_portfolio
  from public.borrower_portfolios
  where borrower_id = p_borrower_id;

  if not found then
    return jsonb_build_object(
      'readiness_status', 'incomplete',
      'missing_fields', jsonb_build_array('Business profile'),
      'risk_flags', jsonb_build_array(),
      'monthly_net_cash_flow', 0,
      'debt_burden_ratio', null,
      'profile_is_stale', false,
      'next_actions', jsonb_build_array('Save your business profile.')
    );
  end if;

  if v_portfolio.business_name is null or char_length(btrim(v_portfolio.business_name)) < 2 then
    v_missing := array_append(v_missing, 'Business name');
  end if;
  if v_portfolio.business_type is null then
    v_missing := array_append(v_missing, 'Business type');
  end if;
  if v_portfolio.location is null or char_length(btrim(v_portfolio.location)) < 3 then
    v_missing := array_append(v_missing, 'Business location');
  end if;

  v_credit := app_private.calculate_borrower_credit_limit_details(
    v_portfolio.monthly_gross_revenue,
    v_portfolio.monthly_expenses,
    v_portfolio.existing_loan_payments,
    v_portfolio.years_in_operation,
    p_borrower_id
  );
  v_monthly_net_cash_flow := (v_credit->>'monthly_net_cash_flow')::numeric;
  v_risk_flags := array(
    select jsonb_array_elements_text(coalesce(v_credit->'risk_flags', '[]'::jsonb))
  );

  if v_portfolio.monthly_gross_revenue = 0 then
    v_risk_flags := array_append(v_risk_flags, 'zero_revenue');
  end if;
  if v_portfolio.monthly_gross_revenue > 0
    and v_portfolio.existing_loan_payments / v_portfolio.monthly_gross_revenue >= 0.4 then
    v_risk_flags := array_append(v_risk_flags, 'high_debt_burden');
  end if;
  if v_portfolio.loan_purpose_context is not null
    and char_length(btrim(v_portfolio.loan_purpose_context)) > 0
    and char_length(btrim(v_portfolio.loan_purpose_context)) < 40 then
    v_risk_flags := array_append(v_risk_flags, 'vague_loan_purpose');
  end if;
  if v_portfolio.years_in_operation < 0.5 then
    v_risk_flags := array_append(v_risk_flags, 'very_new_business');
  end if;

  v_profile_is_stale :=
    v_portfolio.profile_last_confirmed_at is null
    or v_portfolio.profile_last_confirmed_at < now() - interval '180 days'
    or v_portfolio.profile_review_status = 'stale';
  if v_profile_is_stale then
    v_risk_flags := array_append(v_risk_flags, 'stale_profile');
  end if;

  v_debt_burden_ratio := case
    when v_portfolio.monthly_gross_revenue > 0
      then v_portfolio.existing_loan_payments / v_portfolio.monthly_gross_revenue
    else null
  end;

  v_status := case
    when cardinality(v_missing) > 0 then 'incomplete'::public.borrower_credit_readiness_status
    when v_monthly_net_cash_flow <= 0
      or (v_credit->>'available_credit')::numeric <= 0
      or v_portfolio.profile_review_status = 'rejected'
      then 'not_eligible'::public.borrower_credit_readiness_status
    when v_profile_is_stale or cardinality(v_risk_flags) > 0
      then 'needs_review'::public.borrower_credit_readiness_status
    else 'complete'::public.borrower_credit_readiness_status
  end;

  return jsonb_build_object(
    'readiness_status', v_status,
    'missing_fields', to_jsonb(v_missing),
    'risk_flags', to_jsonb(array(select distinct unnest(v_risk_flags))),
    'monthly_net_cash_flow', v_monthly_net_cash_flow,
    'debt_burden_ratio', v_debt_burden_ratio,
    'profile_is_stale', v_profile_is_stale,
    'credit', v_credit,
    'next_actions', case
      when v_status = 'incomplete' then jsonb_build_array('Complete the missing business profile fields.')
      when v_status = 'needs_review' then jsonb_build_array('Update or request review for the flagged profile details.')
      when v_status = 'not_eligible' then jsonb_build_array('Review your profile and available credit before applying.')
      else jsonb_build_array('Complete account, consent, and verification requirements.')
    end
  );
end;
$$;

-- Update borrower_verification_readiness_enforcement to not require loan_purpose_context
create or replace function app_private.borrower_profile_is_ready(
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.borrower_portfolios
    where borrower_id = p_user_id
      and business_type is not null
      and char_length(btrim(location)) between 3 and 120
      and monthly_gross_revenue >= 0
      and monthly_expenses >= 0
      and existing_loan_payments >= 0
      and years_in_operation between 0 and 100
  );
$$;

-- Update submit_lender_onboarding to accept null lender_description
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

-- Update the public wrapper
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

-- Update provisioning function to not require lender_description
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
