do $$
begin
  if not exists (select 1 from pg_type where typname = 'borrower_operating_model') then
    create type public.borrower_operating_model as enum (
      'fixed_store',
      'market_stall',
      'home_based',
      'online',
      'mobile',
      'mixed',
      'other'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'borrower_primary_sales_channel') then
    create type public.borrower_primary_sales_channel as enum (
      'walk_in',
      'online_marketplace',
      'social_media',
      'delivery_apps',
      'wholesale',
      'mixed',
      'other'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'borrower_revenue_period') then
    create type public.borrower_revenue_period as enum (
      'last_30_days',
      'average_monthly_last_3_months',
      'average_monthly_last_6_months',
      'seasonal_estimate'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'borrower_revenue_confidence') then
    create type public.borrower_revenue_confidence as enum (
      'self_declared',
      'partially_documented',
      'document_supported',
      'manager_reviewed'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'borrower_profile_review_status') then
    create type public.borrower_profile_review_status as enum (
      'self_declared',
      'needs_review',
      'reviewed',
      'rejected',
      'stale'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'borrower_credit_readiness_status') then
    create type public.borrower_credit_readiness_status as enum (
      'incomplete',
      'complete',
      'needs_review',
      'not_eligible',
      'eligible_to_apply'
    );
  end if;
end
$$;

alter table public.borrower_portfolios
  add column if not exists business_name text check (
    business_name is null or char_length(btrim(business_name)) between 2 and 120
  ),
  add column if not exists business_description text check (
    business_description is null or char_length(btrim(business_description)) between 20 and 1000
  ),
  add column if not exists started_operating_at date check (
    started_operating_at is null or started_operating_at <= current_date
  ),
  add column if not exists business_address text check (
    business_address is null or char_length(btrim(business_address)) between 5 and 240
  ),
  add column if not exists barangay text check (
    barangay is null or char_length(btrim(barangay)) between 2 and 120
  ),
  add column if not exists city_or_municipality text check (
    city_or_municipality is null or char_length(btrim(city_or_municipality)) between 2 and 120
  ),
  add column if not exists province text check (
    province is null or char_length(btrim(province)) between 2 and 120
  ),
  add column if not exists operating_model public.borrower_operating_model,
  add column if not exists primary_sales_channel public.borrower_primary_sales_channel,
  add column if not exists revenue_period public.borrower_revenue_period,
  add column if not exists revenue_confidence public.borrower_revenue_confidence,
  add column if not exists expense_breakdown jsonb not null default '{}'::jsonb,
  add column if not exists debt_obligation_summary jsonb not null default '{}'::jsonb,
  add column if not exists profile_last_confirmed_at timestamptz,
  add column if not exists profile_review_status public.borrower_profile_review_status not null default 'self_declared';

alter table public.borrower_portfolios
  add constraint borrower_portfolios_expense_breakdown_non_negative
  check (
    coalesce((expense_breakdown->>'inventory')::numeric, 0) >= 0
    and coalesce((expense_breakdown->>'rent')::numeric, 0) >= 0
    and coalesce((expense_breakdown->>'payroll')::numeric, 0) >= 0
    and coalesce((expense_breakdown->>'utilities')::numeric, 0) >= 0
    and coalesce((expense_breakdown->>'other')::numeric, 0) >= 0
  ) not valid;

alter table public.borrower_portfolios
  add constraint borrower_portfolios_debt_summary_non_negative
  check (
    coalesce((debt_obligation_summary->>'active_lender_count')::numeric, 0) >= 0
    and coalesce((debt_obligation_summary->>'total_outstanding_debt')::numeric, 0) >= 0
  ) not valid;

alter table public.loan_applications
  add column if not exists borrower_profile_snapshot jsonb,
  add column if not exists borrower_readiness_snapshot jsonb,
  add column if not exists credit_readiness_status public.borrower_credit_readiness_status,
  add column if not exists monthly_net_cash_flow_at_submission numeric(12, 2);

create or replace function app_private.calculate_borrower_credit_limit_details(
  p_monthly_gross_revenue numeric,
  p_monthly_expenses numeric,
  p_existing_loan_payments numeric,
  p_years_in_operation numeric,
  p_borrower_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_monthly_net_cash_flow numeric;
  v_base_limit numeric;
  v_years_multiplier numeric;
  v_gross_revenue_cap numeric;
  v_calculated_credit_limit numeric;
  v_used_credit numeric := 0;
  v_available_credit numeric;
  v_risk_flags text[] := array[]::text[];
begin
  v_monthly_net_cash_flow :=
    coalesce(p_monthly_gross_revenue, 0)
    - coalesce(p_monthly_expenses, 0)
    - coalesce(p_existing_loan_payments, 0);
  v_base_limit := v_monthly_net_cash_flow * 3;
  v_years_multiplier := case
    when coalesce(p_years_in_operation, 0) < 1 then 0.75
    when coalesce(p_years_in_operation, 0) < 3 then 1.0
    else 1.25
  end;
  v_gross_revenue_cap := coalesce(p_monthly_gross_revenue, 0) * 2;
  v_calculated_credit_limit := app_private.calculate_borrower_credit_limit(
    p_monthly_gross_revenue,
    p_monthly_expenses,
    p_existing_loan_payments,
    p_years_in_operation
  );

  if p_borrower_id is not null then
    v_used_credit := app_private.calculate_borrower_used_credit(p_borrower_id);
  end if;

  v_available_credit := greatest(0, v_calculated_credit_limit - v_used_credit);

  if v_monthly_net_cash_flow <= 0 then
    v_risk_flags := array_append(v_risk_flags, 'non_positive_cash_flow');
  end if;
  if coalesce(p_monthly_expenses, 0) > coalesce(p_monthly_gross_revenue, 0) then
    v_risk_flags := array_append(v_risk_flags, 'expenses_exceed_revenue');
  end if;
  if coalesce(p_existing_loan_payments, 0) > v_monthly_net_cash_flow * 0.4 then
    v_risk_flags := array_append(v_risk_flags, 'high_existing_debt_payments');
  end if;
  if coalesce(p_years_in_operation, 0) < 1 then
    v_risk_flags := array_append(v_risk_flags, 'very_new_business');
  end if;

  return jsonb_build_object(
    'calculated_credit_limit', v_calculated_credit_limit,
    'used_credit', v_used_credit,
    'available_credit', v_available_credit,
    'monthly_net_cash_flow', v_monthly_net_cash_flow,
    'base_limit', v_base_limit,
    'years_multiplier', v_years_multiplier,
    'gross_revenue_cap', v_gross_revenue_cap,
    'maximum_cap', 1000000,
    'risk_flags', to_jsonb(v_risk_flags)
  );
end;
$$;

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
  if v_portfolio.business_description is null or char_length(btrim(v_portfolio.business_description)) < 20 then
    v_missing := array_append(v_missing, 'Business description');
  end if;
  if v_portfolio.started_operating_at is null then
    v_missing := array_append(v_missing, 'Business start date');
  end if;
  if v_portfolio.business_address is null or char_length(btrim(v_portfolio.business_address)) < 5 then
    v_missing := array_append(v_missing, 'Business address');
  end if;
  if v_portfolio.barangay is null or char_length(btrim(v_portfolio.barangay)) < 2 then
    v_missing := array_append(v_missing, 'Barangay');
  end if;
  if v_portfolio.city_or_municipality is null or char_length(btrim(v_portfolio.city_or_municipality)) < 2 then
    v_missing := array_append(v_missing, 'City or municipality');
  end if;
  if v_portfolio.province is null or char_length(btrim(v_portfolio.province)) < 2 then
    v_missing := array_append(v_missing, 'Province');
  end if;
  if v_portfolio.operating_model is null then
    v_missing := array_append(v_missing, 'Operating model');
  end if;
  if v_portfolio.primary_sales_channel is null then
    v_missing := array_append(v_missing, 'Primary sales channel');
  end if;
  if v_portfolio.revenue_period is null then
    v_missing := array_append(v_missing, 'Revenue period');
  end if;
  if v_portfolio.revenue_confidence is null then
    v_missing := array_append(v_missing, 'Revenue confidence');
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
  if char_length(btrim(v_portfolio.loan_purpose_context)) < 40 then
    v_risk_flags := array_append(v_risk_flags, 'vague_loan_purpose');
  end if;
  if v_portfolio.started_operating_at is not null
    and v_portfolio.started_operating_at > current_date - interval '6 months' then
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

create or replace function app_private.has_complete_borrower_profile(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    app_private.borrower_profile_readiness(p_user_id)->>'readiness_status',
    'incomplete'
  ) in ('complete', 'eligible_to_apply');
$$;

create or replace function app_private.borrower_application_readiness(
  p_borrower_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles%rowtype;
  v_verification public.borrower_verifications%rowtype;
  v_document_policy jsonb;
  v_profile_readiness jsonb;
  v_profile_status text;
  v_codes text[] := array[]::text[];
  v_readiness_status public.borrower_credit_readiness_status;
begin
  select * into v_profile
  from public.profiles
  where id = p_borrower_id
    and role = 'borrower';

  if not found then
    return jsonb_build_object(
      'ok', false,
      'application_ready', false,
      'readiness_status', 'incomplete',
      'codes', jsonb_build_array('profile_required'),
      'primary_code', 'profile_required',
      'message', 'Complete your borrower profile before applying.'
    );
  end if;

  if v_profile.status <> 'active' then
    v_codes := array_append(
      v_codes,
      case when v_profile.status = 'suspended' then 'suspended' else 'account_not_active' end
    );
  end if;

  v_profile_readiness := app_private.borrower_profile_readiness(p_borrower_id);
  v_profile_status := v_profile_readiness->>'readiness_status';

  if v_profile_status = 'incomplete' then
    v_codes := array_append(v_codes, 'profile_incomplete');
  elsif v_profile_status = 'needs_review' then
    if coalesce((v_profile_readiness->>'profile_is_stale')::boolean, false) then
      v_codes := array_append(v_codes, 'profile_stale');
    else
      v_codes := array_append(v_codes, 'profile_needs_review');
    end if;
  elsif v_profile_status = 'not_eligible' then
    v_codes := array_append(v_codes, 'not_eligible');
  end if;

  if not app_private.has_borrower_loan_application_consents(p_borrower_id) then
    v_codes := array_append(v_codes, 'consent_required');
  end if;

  select * into v_verification
  from public.borrower_verifications
  where borrower_id = p_borrower_id;

  if not found or v_verification.verification_status <> 'approved' then
    v_codes := array_append(v_codes, 'borrower_verification_required');
  end if;

  v_document_policy := app_private.borrower_verification_document_policy(p_borrower_id);

  if not coalesce((v_document_policy->>'documents_accepted')::boolean, false) then
    v_codes := array_append(v_codes, 'documents_required');
  end if;

  v_readiness_status := case
    when cardinality(v_codes) = 0 then 'eligible_to_apply'::public.borrower_credit_readiness_status
    else coalesce(v_profile_status, 'incomplete')::public.borrower_credit_readiness_status
  end;

  return jsonb_build_object(
    'ok', cardinality(v_codes) = 0,
    'application_ready', cardinality(v_codes) = 0,
    'readiness_status', v_readiness_status,
    'codes', to_jsonb(v_codes),
    'primary_code', case when cardinality(v_codes) = 0 then null else v_codes[1] end,
    'profile_complete', v_profile_status in ('complete', 'eligible_to_apply'),
    'profile_readiness', v_profile_readiness,
    'account_status', v_profile.status,
    'borrower_verification_status', v_verification.verification_status,
    'document_policy', v_document_policy,
    'message', case
      when cardinality(v_codes) = 0 then 'Application ready.'
      when v_codes[1] = 'profile_incomplete' then 'Complete your business profile before submitting an application.'
      when v_codes[1] = 'profile_needs_review' then 'Your business profile needs review before applying.'
      when v_codes[1] = 'profile_stale' then 'Confirm your current business profile before applying.'
      when v_codes[1] = 'not_eligible' then 'Your current profile is not eligible to apply.'
      when v_codes[1] = 'consent_required' then 'Accept the required disclosures before submitting an application.'
      when v_codes[1] = 'borrower_verification_required' then 'Borrower verification is required before submitting a loan application.'
      when v_codes[1] = 'documents_required' then 'Upload and complete review for the required verification documents.'
      when v_codes[1] = 'suspended' then 'This account is suspended.'
      else 'This account is not active.'
    end
  );
end;
$$;

create or replace function app_private.enforce_loan_application_credit_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_portfolio public.borrower_portfolios%rowtype;
  v_credit jsonb;
  v_readiness jsonb;
  v_available_credit numeric;
begin
  perform pg_advisory_xact_lock(hashtext(new.borrower_id::text));

  select * into v_portfolio
  from public.borrower_portfolios
  where id = new.borrower_portfolio_id
    and borrower_id = new.borrower_id;

  if not found then
    raise exception 'Save your business profile before submitting an application.'
      using errcode = 'P0001';
  end if;

  v_readiness := app_private.borrower_application_readiness(new.borrower_id);

  if not coalesce((v_readiness->>'application_ready')::boolean, false) then
    raise exception 'Borrower profile is not ready for application submission.'
      using errcode = 'P0001';
  end if;

  v_credit := app_private.calculate_borrower_credit_limit_details(
    v_portfolio.monthly_gross_revenue,
    v_portfolio.monthly_expenses,
    v_portfolio.existing_loan_payments,
    v_portfolio.years_in_operation,
    new.borrower_id
  );
  v_available_credit := (v_credit->>'available_credit')::numeric;

  if new.requested_amount > v_available_credit then
    raise exception 'Requested amount exceeds your available credit.'
      using errcode = 'P0001';
  end if;

  if tg_op = 'INSERT' then
    new.credit_limit_at_submission := round((v_credit->>'calculated_credit_limit')::numeric, 2);
    new.used_credit_at_submission := round((v_credit->>'used_credit')::numeric, 2);
    new.available_credit_at_submission := round(v_available_credit, 2);
    new.monthly_net_cash_flow_at_submission := round((v_credit->>'monthly_net_cash_flow')::numeric, 2);
    new.credit_readiness_status := 'eligible_to_apply';
    new.borrower_profile_snapshot := to_jsonb(v_portfolio);
    new.borrower_readiness_snapshot := v_readiness;
  end if;

  return new;
end;
$$;

create or replace function app_private.submit_loan_application(
  p_requested_amount numeric,
  p_purpose text,
  p_preferred_term public.preferred_term,
  p_remarks text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_application record;
  v_credit jsonb;
  v_portfolio public.borrower_portfolios%rowtype;
  v_readiness jsonb;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'code', 'auth_required', 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_borrower(v_actor_id) then
    return jsonb_build_object('ok', false, 'code', 'not_allowed', 'message', 'Could not submit application.');
  end if;

  v_readiness := app_private.borrower_application_readiness(v_actor_id);
  perform app_private.write_audit_log(
    'borrower_readiness_evaluated',
    'profiles',
    v_actor_id,
    jsonb_build_object(
      'borrower_id', v_actor_id,
      'readiness_status', v_readiness->>'readiness_status',
      'codes', v_readiness->'codes',
      'risk_flags', v_readiness->'profile_readiness'->'risk_flags'
    )
  );

  if not coalesce((v_readiness->>'application_ready')::boolean, false) then
    return jsonb_build_object(
      'ok', false,
      'code', v_readiness->>'primary_code',
      'codes', v_readiness->'codes',
      'message', v_readiness->>'message',
      'readiness', v_readiness
    );
  end if;

  if p_requested_amount is null
    or p_requested_amount < 1000
    or p_requested_amount > 1000000 then
    return jsonb_build_object('ok', false, 'code', 'invalid_amount', 'message', 'Review the highlighted fields before submitting.');
  end if;

  if p_purpose is null
    or char_length(btrim(p_purpose)) < 10
    or char_length(btrim(p_purpose)) > 160 then
    return jsonb_build_object('ok', false, 'code', 'invalid_purpose', 'message', 'Review the highlighted fields before submitting.');
  end if;

  if p_preferred_term is null then
    return jsonb_build_object('ok', false, 'code', 'invalid_term', 'message', 'Review the highlighted fields before submitting.');
  end if;

  if p_remarks is not null and char_length(btrim(p_remarks)) > 500 then
    return jsonb_build_object('ok', false, 'code', 'invalid_remarks', 'message', 'Review the highlighted fields before submitting.');
  end if;

  perform pg_advisory_xact_lock(hashtext(v_actor_id::text));

  select * into v_portfolio
  from public.borrower_portfolios
  where borrower_id = v_actor_id;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'profile_required', 'message', 'Save your business profile before submitting an application.');
  end if;

  v_credit := app_private.calculate_borrower_credit_limit_details(
    v_portfolio.monthly_gross_revenue,
    v_portfolio.monthly_expenses,
    v_portfolio.existing_loan_payments,
    v_portfolio.years_in_operation,
    v_actor_id
  );

  if p_requested_amount > (v_credit->>'available_credit')::numeric then
    return jsonb_build_object(
      'ok', false,
      'code', 'credit_limit_exceeded',
      'message', 'Requested amount exceeds your available credit.',
      'credit_limit', (v_credit->>'calculated_credit_limit')::numeric,
      'used_credit', (v_credit->>'used_credit')::numeric,
      'available_credit', (v_credit->>'available_credit')::numeric
    );
  end if;

  insert into public.loan_applications (
    borrower_id,
    borrower_portfolio_id,
    requested_amount,
    purpose,
    preferred_term,
    remarks,
    status,
    credit_limit_at_submission,
    used_credit_at_submission,
    available_credit_at_submission,
    monthly_net_cash_flow_at_submission,
    credit_readiness_status,
    borrower_profile_snapshot,
    borrower_readiness_snapshot
  )
  values (
    v_actor_id,
    v_portfolio.id,
    round(p_requested_amount, 2),
    btrim(p_purpose),
    p_preferred_term,
    nullif(btrim(coalesce(p_remarks, '')), ''),
    'submitted',
    round((v_credit->>'calculated_credit_limit')::numeric, 2),
    round((v_credit->>'used_credit')::numeric, 2),
    round((v_credit->>'available_credit')::numeric, 2),
    round((v_credit->>'monthly_net_cash_flow')::numeric, 2),
    'eligible_to_apply',
    to_jsonb(v_portfolio),
    v_readiness
  )
  returning id, borrower_id, borrower_portfolio_id, requested_amount, purpose,
    preferred_term, remarks, status, submitted_at, created_at, updated_at,
    credit_limit_at_submission, used_credit_at_submission,
    available_credit_at_submission, monthly_net_cash_flow_at_submission,
    credit_readiness_status, borrower_profile_snapshot, borrower_readiness_snapshot
  into v_application;

  perform app_private.write_audit_log(
    'loan_application_submitted_with_profile_snapshot',
    'loan_applications',
    v_application.id,
    jsonb_build_object(
      'borrower_id', v_actor_id,
      'credit_readiness_status', v_application.credit_readiness_status,
      'risk_flags', v_readiness->'profile_readiness'->'risk_flags',
      'available_credit', v_application.available_credit_at_submission
    )
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Application submitted.',
    'application', to_jsonb(v_application),
    'credit_limit', (v_credit->>'calculated_credit_limit')::numeric,
    'used_credit', (v_credit->>'used_credit')::numeric,
    'available_credit', (v_credit->>'available_credit')::numeric
  );
exception
  when check_violation or not_null_violation then
    return jsonb_build_object('ok', false, 'code', 'invalid_application', 'message', 'Review the highlighted fields before submitting.');
end;
$$;

drop policy if exists "loan_applications_insert_own_borrower" on public.loan_applications;
create policy "loan_applications_insert_own_borrower"
  on public.loan_applications for insert
  to authenticated
  with check (
    (select auth.uid()) = borrower_id
    and app_private.is_application_ready_borrower((select auth.uid()))
    and status = 'submitted'
    and app_private.borrower_owns_portfolio(
      borrower_portfolio_id,
      (select auth.uid())
    )
  );

grant execute on function app_private.calculate_borrower_credit_limit_details(
  numeric,
  numeric,
  numeric,
  numeric,
  uuid
) to authenticated;
grant execute on function app_private.borrower_profile_readiness(uuid)
  to authenticated;

create or replace function app_private.audit_foundation_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_action text;
  v_metadata jsonb := '{}'::jsonb;
begin
  if tg_table_name = 'profiles' and tg_op = 'INSERT' then
    v_action := 'profile_created';
    v_metadata := jsonb_build_object('operation', tg_op);
  elsif tg_table_name = 'profiles' and tg_op = 'UPDATE' then
    v_action := 'profile_updated';
    v_metadata := jsonb_build_object('operation', tg_op);
  elsif tg_table_name = 'borrower_portfolios' and tg_op = 'INSERT' then
    v_action := 'borrower_profile_created';
    v_metadata := jsonb_build_object(
      'operation', tg_op,
      'borrower_id', new.borrower_id,
      'profile_review_status', new.profile_review_status
    );
  elsif tg_table_name = 'borrower_portfolios' and tg_op = 'UPDATE' then
    v_action := case
      when old.profile_review_status is distinct from new.profile_review_status
        and new.profile_review_status = 'stale' then 'borrower_profile_marked_stale'
      when old.profile_last_confirmed_at is distinct from new.profile_last_confirmed_at
        then 'borrower_profile_confirmed'
      else 'borrower_profile_updated'
    end;
    v_metadata := jsonb_build_object(
      'operation', tg_op,
      'borrower_id', new.borrower_id,
      'profile_review_status', new.profile_review_status
    );
  elsif tg_table_name = 'loan_applications' and tg_op = 'INSERT' then
    v_action := case
      when new.borrower_profile_snapshot is not null
        then 'loan_application_submitted_with_profile_snapshot'
      else 'application_submitted'
    end;
    v_metadata := jsonb_build_object(
      'operation', tg_op,
      'borrower_id', new.borrower_id,
      'credit_readiness_status', new.credit_readiness_status,
      'available_credit', new.available_credit_at_submission
    );
  elsif tg_table_name = 'loan_offers' and tg_op = 'INSERT' then
    v_action := 'offer_created';
    v_metadata := jsonb_build_object('operation', tg_op);
  else
    return new;
  end if;

  perform app_private.write_audit_log(
    v_action,
    tg_table_name,
    new.id,
    v_metadata
  );

  return new;
end;
$$;
