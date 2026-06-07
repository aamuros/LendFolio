alter type public.business_type add value if not exists 'small_retail_shop';
alter type public.business_type add value if not exists 'laundry_service';
alter type public.business_type add value if not exists 'beauty_barber_service';
alter type public.business_type add value if not exists 'repair_service';
alter type public.business_type add value if not exists 'transport_delivery_operator';

alter type public.borrower_operating_model add value if not exists 'physical_store';
alter type public.borrower_operating_model add value if not exists 'mobile_delivery_based';
alter type public.borrower_operating_model add value if not exists 'online_only';
alter type public.borrower_operating_model add value if not exists 'mixed_online_physical';

alter type public.borrower_primary_sales_channel add value if not exists 'walk_in_customers';
alter type public.borrower_primary_sales_channel add value if not exists 'online_orders';
alter type public.borrower_primary_sales_channel add value if not exists 'facebook_marketplace';
alter type public.borrower_primary_sales_channel add value if not exists 'ecommerce_platform';
alter type public.borrower_primary_sales_channel add value if not exists 'regular_clients';

alter type public.borrower_revenue_period add value if not exists 'last_7_days';
alter type public.borrower_revenue_period add value if not exists 'last_3_months_average';
alter type public.borrower_revenue_period add value if not exists 'last_6_months_average';
alter type public.borrower_revenue_period add value if not exists 'self_estimated_normal_month';

alter type public.borrower_revenue_confidence add value if not exists 'sales_records';
alter type public.borrower_revenue_confidence add value if not exists 'bank_ewallet_proof';
alter type public.borrower_revenue_confidence add value if not exists 'supplier_receipts';
alter type public.borrower_revenue_confidence add value if not exists 'self_declared_only';

do $$
begin
  if not exists (select 1 from pg_type where typname = 'borrower_ownership_type') then
    create type public.borrower_ownership_type as enum (
      'sole_proprietor',
      'family_owned',
      'partnership',
      'informal_unregistered',
      'other'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'borrower_role') then
    create type public.borrower_role as enum (
      'owner_proprietor',
      'co_owner',
      'manager',
      'family_operator'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'borrower_business_schedule') then
    create type public.borrower_business_schedule as enum (
      'daily',
      'weekdays_only',
      'weekends_only',
      'seasonal',
      'irregular'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'borrower_business_registration_type') then
    create type public.borrower_business_registration_type as enum (
      'barangay_permit',
      'dti',
      'mayors_permit',
      'bir',
      'sec',
      'other'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'borrower_average_collection_period') then
    create type public.borrower_average_collection_period as enum (
      'daily',
      'weekly',
      'every_payday',
      'monthly',
      'irregular'
    );
  end if;
end
$$;

alter table public.borrower_portfolios
  add column if not exists mobile_number text,
  add column if not exists home_address text,
  add column if not exists years_at_current_address numeric(5, 2) not null default 0,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_number text,
  add column if not exists emergency_contact_relationship text,
  add column if not exists is_business_address_same_as_home boolean not null default false,
  add column if not exists ownership_type public.borrower_ownership_type,
  add column if not exists borrower_role public.borrower_role,
  add column if not exists business_schedule public.borrower_business_schedule,
  add column if not exists number_of_employees numeric(8, 0) not null default 0,
  add column if not exists main_products_or_services text,
  add column if not exists main_suppliers text,
  add column if not exists keeps_sales_records boolean not null default false,
  add column if not exists uses_bank_or_ewallet boolean not null default false,
  add column if not exists offers_customer_credit boolean not null default false,
  add column if not exists has_business_registration boolean not null default false,
  add column if not exists business_registration_type public.borrower_business_registration_type,
  add column if not exists registration_number text,
  add column if not exists registration_date date,
  add column if not exists unregistered_reason text,
  add column if not exists average_daily_sales numeric(12, 2) not null default 0,
  add column if not exists average_weekly_sales numeric(12, 2) not null default 0,
  add column if not exists best_month_sales numeric(12, 2) not null default 0,
  add column if not exists worst_month_sales numeric(12, 2) not null default 0,
  add column if not exists monthly_inventory_cost numeric(12, 2) not null default 0,
  add column if not exists monthly_business_rent numeric(12, 2) not null default 0,
  add column if not exists monthly_business_electricity numeric(12, 2) not null default 0,
  add column if not exists monthly_business_water numeric(12, 2) not null default 0,
  add column if not exists monthly_helper_salary numeric(12, 2) not null default 0,
  add column if not exists monthly_transportation_delivery numeric(12, 2) not null default 0,
  add column if not exists monthly_packaging_cost numeric(12, 2) not null default 0,
  add column if not exists monthly_platform_fees numeric(12, 2) not null default 0,
  add column if not exists monthly_maintenance_repairs numeric(12, 2) not null default 0,
  add column if not exists monthly_supplier_credit_payment numeric(12, 2) not null default 0,
  add column if not exists other_business_expenses numeric(12, 2) not null default 0,
  add column if not exists monthly_rent_or_mortgage numeric(12, 2) not null default 0,
  add column if not exists monthly_electricity_bill numeric(12, 2) not null default 0,
  add column if not exists monthly_water_bill numeric(12, 2) not null default 0,
  add column if not exists monthly_internet_phone_bill numeric(12, 2) not null default 0,
  add column if not exists monthly_food_groceries numeric(12, 2) not null default 0,
  add column if not exists monthly_transportation numeric(12, 2) not null default 0,
  add column if not exists monthly_tuition_education numeric(12, 2) not null default 0,
  add column if not exists monthly_medical_expenses numeric(12, 2) not null default 0,
  add column if not exists monthly_insurance numeric(12, 2) not null default 0,
  add column if not exists monthly_family_support numeric(12, 2) not null default 0,
  add column if not exists other_household_expenses numeric(12, 2) not null default 0,
  add column if not exists number_of_dependents numeric(5, 0) not null default 0,
  add column if not exists number_of_earning_household_members numeric(5, 0) not null default 0,
  add column if not exists household_expenses_completed boolean not null default false,
  add column if not exists has_existing_debts boolean not null default false,
  add column if not exists personal_loan_payments numeric(12, 2) not null default 0,
  add column if not exists business_loan_payments numeric(12, 2) not null default 0,
  add column if not exists vehicle_loan_payments numeric(12, 2) not null default 0,
  add column if not exists home_loan_payments numeric(12, 2) not null default 0,
  add column if not exists lending_app_payments numeric(12, 2) not null default 0,
  add column if not exists informal_loan_payments numeric(12, 2) not null default 0,
  add column if not exists buy_now_pay_later_payments numeric(12, 2) not null default 0,
  add column if not exists credit_card_payments numeric(12, 2) not null default 0,
  add column if not exists co_maker_guaranteed_loan_payments numeric(12, 2) not null default 0,
  add column if not exists other_debt_payments numeric(12, 2) not null default 0,
  add column if not exists existing_debt_declaration_completed boolean not null default false,
  add column if not exists cash_on_hand numeric(12, 2) not null default 0,
  add column if not exists bank_savings numeric(12, 2) not null default 0,
  add column if not exists ewallet_balance numeric(12, 2) not null default 0,
  add column if not exists inventory_value numeric(12, 2) not null default 0,
  add column if not exists business_equipment_value numeric(12, 2) not null default 0,
  add column if not exists vehicle_value numeric(12, 2) not null default 0,
  add column if not exists property_land_value numeric(12, 2) not null default 0,
  add column if not exists other_assets_value numeric(12, 2) not null default 0,
  add column if not exists estimated_customer_credit_amount numeric(12, 2) not null default 0,
  add column if not exists average_collection_period public.borrower_average_collection_period,
  add column if not exists keeps_customer_debt_list boolean,
  add column if not exists has_overdue_loans boolean not null default false,
  add column if not exists missed_payments_last_12_months boolean not null default false,
  add column if not exists has_unpaid_lending_app_loans boolean not null default false,
  add column if not exists has_bounced_checks boolean not null default false,
  add column if not exists is_co_maker_or_guarantor boolean not null default false,
  add column if not exists has_debt_related_legal_case boolean not null default false,
  add column if not exists has_repossession_history boolean not null default false,
  add column if not exists has_tax_arrears boolean not null default false,
  add column if not exists business_temporarily_stopped boolean not null default false,
  add column if not exists confirms_business_operating boolean not null default false,
  add column if not exists confirms_information_true boolean not null default false,
  add column if not exists consents_to_data_processing boolean not null default false,
  add column if not exists consents_to_credit_check boolean not null default false;

alter table public.borrower_portfolios
  drop constraint if exists borrower_portfolios_microbusiness_non_negative;

alter table public.borrower_portfolios
  add constraint borrower_portfolios_microbusiness_non_negative
  check (
    years_at_current_address >= 0
    and number_of_employees >= 0
    and average_daily_sales >= 0
    and average_weekly_sales >= 0
    and best_month_sales >= 0
    and worst_month_sales >= 0
    and monthly_inventory_cost >= 0
    and monthly_business_rent >= 0
    and monthly_business_electricity >= 0
    and monthly_business_water >= 0
    and monthly_helper_salary >= 0
    and monthly_transportation_delivery >= 0
    and monthly_packaging_cost >= 0
    and monthly_platform_fees >= 0
    and monthly_maintenance_repairs >= 0
    and monthly_supplier_credit_payment >= 0
    and other_business_expenses >= 0
    and monthly_rent_or_mortgage >= 0
    and monthly_electricity_bill >= 0
    and monthly_water_bill >= 0
    and monthly_internet_phone_bill >= 0
    and monthly_food_groceries >= 0
    and monthly_transportation >= 0
    and monthly_tuition_education >= 0
    and monthly_medical_expenses >= 0
    and monthly_insurance >= 0
    and monthly_family_support >= 0
    and other_household_expenses >= 0
    and number_of_dependents >= 0
    and number_of_earning_household_members >= 0
    and personal_loan_payments >= 0
    and business_loan_payments >= 0
    and vehicle_loan_payments >= 0
    and home_loan_payments >= 0
    and lending_app_payments >= 0
    and informal_loan_payments >= 0
    and buy_now_pay_later_payments >= 0
    and credit_card_payments >= 0
    and co_maker_guaranteed_loan_payments >= 0
    and other_debt_payments >= 0
    and cash_on_hand >= 0
    and bank_savings >= 0
    and ewallet_balance >= 0
    and inventory_value >= 0
    and business_equipment_value >= 0
    and vehicle_value >= 0
    and property_land_value >= 0
    and other_assets_value >= 0
    and estimated_customer_credit_amount >= 0
  ) not valid;

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
  v_household_expenses numeric := 0;
  v_monthly_net_cash_flow numeric;
  v_base_limit numeric;
  v_years_multiplier numeric;
  v_gross_revenue_cap numeric;
  v_calculated_credit_limit numeric;
  v_used_credit numeric := 0;
  v_available_credit numeric;
  v_risk_flags text[] := array[]::text[];
begin
  if p_borrower_id is not null then
    select coalesce(monthly_rent_or_mortgage, 0)
      + coalesce(monthly_electricity_bill, 0)
      + coalesce(monthly_water_bill, 0)
      + coalesce(monthly_internet_phone_bill, 0)
      + coalesce(monthly_food_groceries, 0)
      + coalesce(monthly_transportation, 0)
      + coalesce(monthly_tuition_education, 0)
      + coalesce(monthly_medical_expenses, 0)
      + coalesce(monthly_insurance, 0)
      + coalesce(monthly_family_support, 0)
      + coalesce(other_household_expenses, 0)
    into v_household_expenses
    from public.borrower_portfolios
    where borrower_id = p_borrower_id;
  end if;

  v_monthly_net_cash_flow :=
    coalesce(p_monthly_gross_revenue, 0)
    - coalesce(p_monthly_expenses, 0)
    - coalesce(v_household_expenses, 0)
    - coalesce(p_existing_loan_payments, 0);
  v_base_limit := v_monthly_net_cash_flow * 3;
  v_years_multiplier := case
    when coalesce(p_years_in_operation, 0) < 1 then 0.75
    when coalesce(p_years_in_operation, 0) < 3 then 1.0
    else 1.25
  end;
  v_gross_revenue_cap := coalesce(p_monthly_gross_revenue, 0) * 2;
  v_calculated_credit_limit := greatest(
    0,
    floor(least(
      v_base_limit * v_years_multiplier,
      v_gross_revenue_cap,
      1000000
    ) / 100) * 100
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
  if coalesce(p_monthly_gross_revenue, 0) > 0
    and coalesce(p_existing_loan_payments, 0) / p_monthly_gross_revenue >= 0.4 then
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
  v_blocking_flags text[] := array[]::text[];
  v_status public.borrower_credit_readiness_status;
  v_profile_is_stale boolean := false;
  v_disposable_income numeric := 0;
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
      'next_actions', jsonb_build_array('Save your microbusiness profile.')
    );
  end if;

  if v_portfolio.business_name is null or char_length(btrim(v_portfolio.business_name)) < 2 then
    v_missing := array_append(v_missing, 'Business name');
  end if;
  if v_portfolio.business_type is null then
    v_missing := array_append(v_missing, 'Business type');
  end if;
  if (v_portfolio.location is null or char_length(btrim(v_portfolio.location)) < 3)
    and (v_portfolio.business_address is null or char_length(btrim(v_portfolio.business_address)) < 3) then
    v_missing := array_append(v_missing, 'Business location');
  end if;
  if v_portfolio.years_in_operation is null then
    v_missing := array_append(v_missing, 'Years in operation');
  end if;
  if v_portfolio.loan_purpose_context is null or char_length(btrim(v_portfolio.loan_purpose_context)) = 0 then
    v_missing := array_append(v_missing, 'Loan use context');
  end if;
  if not v_portfolio.household_expenses_completed then
    v_missing := array_append(v_missing, 'Household expense declaration');
  end if;
  if not v_portfolio.existing_debt_declaration_completed then
    v_missing := array_append(v_missing, 'Existing debt declaration');
  end if;
  if not v_portfolio.confirms_information_true then
    v_missing := array_append(v_missing, 'Truthfulness confirmation');
  end if;
  if not v_portfolio.consents_to_data_processing then
    v_missing := array_append(v_missing, 'Data processing consent');
  end if;
  if not v_portfolio.consents_to_credit_check then
    v_missing := array_append(v_missing, 'Credit check consent');
  end if;
  if not v_portfolio.confirms_business_operating then
    v_missing := array_append(v_missing, 'Business operating confirmation');
  end if;

  v_credit := app_private.calculate_borrower_credit_limit_details(
    v_portfolio.monthly_gross_revenue,
    v_portfolio.monthly_expenses,
    v_portfolio.existing_loan_payments,
    v_portfolio.years_in_operation,
    p_borrower_id
  );
  v_disposable_income := (v_credit->>'monthly_net_cash_flow')::numeric;
  v_risk_flags := array(
    select jsonb_array_elements_text(coalesce(v_credit->'risk_flags', '[]'::jsonb))
  );

  if v_portfolio.monthly_gross_revenue <= 0 then
    v_risk_flags := array_append(v_risk_flags, 'zero_revenue');
    v_blocking_flags := array_append(v_blocking_flags, 'zero_revenue');
  end if;
  if v_disposable_income <= 0 then
    v_blocking_flags := array_append(v_blocking_flags, 'non_positive_cash_flow');
  end if;
  if v_portfolio.monthly_expenses > v_portfolio.monthly_gross_revenue then
    v_risk_flags := array_append(v_risk_flags, 'expenses_exceed_revenue');
  end if;
  if v_portfolio.monthly_gross_revenue > 0
    and v_portfolio.existing_loan_payments / v_portfolio.monthly_gross_revenue >= 0.4 then
    v_risk_flags := array_append(v_risk_flags, 'high_debt_burden');
  end if;
  if v_portfolio.loan_purpose_context is not null
    and (
      char_length(btrim(v_portfolio.loan_purpose_context)) < 40
      or lower(btrim(v_portfolio.loan_purpose_context)) in ('business', 'personal', 'need money', 'expenses', 'capital', 'capital only')
    ) then
    v_risk_flags := array_append(v_risk_flags, 'vague_loan_purpose');
  end if;
  if v_portfolio.years_in_operation < 0.5 then
    v_risk_flags := array_append(v_risk_flags, 'very_new_business');
  end if;
  if not v_portfolio.has_business_registration then
    v_risk_flags := array_append(v_risk_flags, 'no_business_proof');
  end if;
  if v_portfolio.revenue_confidence::text in ('self_declared', 'self_declared_only') then
    v_risk_flags := array_append(v_risk_flags, 'self_declared_income_only');
  end if;
  if v_portfolio.monthly_gross_revenue > 0
    and v_portfolio.estimated_customer_credit_amount / v_portfolio.monthly_gross_revenue >= 0.25 then
    v_risk_flags := array_append(v_risk_flags, 'high_customer_credit_exposure');
  end if;
  if v_portfolio.has_overdue_loans then v_risk_flags := array_append(v_risk_flags, 'overdue_debt_declared'); end if;
  if v_portfolio.missed_payments_last_12_months then v_risk_flags := array_append(v_risk_flags, 'missed_payments_declared'); end if;
  if v_portfolio.has_unpaid_lending_app_loans then v_risk_flags := array_append(v_risk_flags, 'unpaid_lending_app_declared'); end if;
  if v_portfolio.has_bounced_checks then v_risk_flags := array_append(v_risk_flags, 'bounced_check_declared'); end if;
  if v_portfolio.is_co_maker_or_guarantor then v_risk_flags := array_append(v_risk_flags, 'co_maker_obligation_declared'); end if;
  if v_portfolio.has_debt_related_legal_case then v_risk_flags := array_append(v_risk_flags, 'debt_legal_case_declared'); end if;
  if v_portfolio.has_repossession_history then v_risk_flags := array_append(v_risk_flags, 'repossession_declared'); end if;
  if v_portfolio.has_tax_arrears then v_risk_flags := array_append(v_risk_flags, 'tax_arrears_declared'); end if;
  if v_portfolio.business_temporarily_stopped then v_risk_flags := array_append(v_risk_flags, 'business_temporarily_closed'); end if;

  v_debt_burden_ratio := case
    when v_portfolio.monthly_gross_revenue > 0
      then v_portfolio.existing_loan_payments / v_portfolio.monthly_gross_revenue
    else null
  end;

  v_status := case
    when cardinality(v_missing) > 0 then 'incomplete'::public.borrower_credit_readiness_status
    when cardinality(v_blocking_flags) > 0
      or (v_credit->>'available_credit')::numeric <= 0
      or v_portfolio.profile_review_status = 'rejected'
      then 'not_eligible'::public.borrower_credit_readiness_status
    when cardinality(v_risk_flags) > 0
      then 'needs_review'::public.borrower_credit_readiness_status
    else 'complete'::public.borrower_credit_readiness_status
  end;

  return jsonb_build_object(
    'readiness_status', v_status,
    'missing_fields', to_jsonb(v_missing),
    'risk_flags', to_jsonb(array(select distinct unnest(v_risk_flags || v_blocking_flags))),
    'monthly_net_cash_flow', v_disposable_income,
    'debt_burden_ratio', v_debt_burden_ratio,
    'profile_is_stale', v_profile_is_stale,
    'credit', v_credit,
    'next_actions', case
      when v_status = 'incomplete' then jsonb_build_array('Complete the missing microbusiness profile fields.')
      when v_status = 'needs_review' then jsonb_build_array('Your profile can be reviewed with the flagged details.')
      when v_status = 'not_eligible' then jsonb_build_array('Review your profile and available credit before applying.')
      else jsonb_build_array('Complete account, consent, and verification requirements.')
    end
  );
end;
$$;

create or replace function app_private.borrower_profile_is_ready(
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((app_private.borrower_profile_readiness(p_user_id)->>'readiness_status') in ('complete', 'eligible_to_apply'), false);
$$;
