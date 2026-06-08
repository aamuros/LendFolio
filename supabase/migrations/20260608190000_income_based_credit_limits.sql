-- Align borrower credit limits with income-based starting capacity and repayment-history caps.

create or replace function app_private.calculate_borrower_repayment_history_cap(
  p_clean_completed_loan_count integer,
  p_late_repayment_count integer,
  p_defaulted_loan_count integer
)
returns numeric
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when greatest(coalesce(p_defaulted_loan_count, 0), 0) > 0 then 0
    when greatest(coalesce(p_clean_completed_loan_count, 0), 0)
      - case when greatest(coalesce(p_late_repayment_count, 0), 0) > 0 then 1 else 0 end <= 0 then 10000
    when greatest(coalesce(p_clean_completed_loan_count, 0), 0)
      - case when greatest(coalesce(p_late_repayment_count, 0), 0) > 0 then 1 else 0 end = 1 then 15000
    when greatest(coalesce(p_clean_completed_loan_count, 0), 0)
      - case when greatest(coalesce(p_late_repayment_count, 0), 0) > 0 then 1 else 0 end = 2 then 25000
    when greatest(coalesce(p_clean_completed_loan_count, 0), 0)
      - case when greatest(coalesce(p_late_repayment_count, 0), 0) > 0 then 1 else 0 end = 3 then 40000
    when greatest(coalesce(p_clean_completed_loan_count, 0), 0)
      - case when greatest(coalesce(p_late_repayment_count, 0), 0) > 0 then 1 else 0 end <= 5 then 60000
    else 100000
  end;
$$;

create or replace function app_private.calculate_borrower_credit_limit(
  p_monthly_gross_revenue numeric,
  p_monthly_expenses numeric,
  p_existing_loan_payments numeric,
  p_years_in_operation numeric
)
returns numeric
language sql
stable
set search_path = public, pg_temp
as $$
  select greatest(
    0,
    floor(least(
      greatest(
        0,
        (
          coalesce(p_monthly_gross_revenue, 0)
          - coalesce(p_monthly_expenses, 0)
          - coalesce(p_existing_loan_payments, 0)
        ) * 0.30 * 3
      ),
      10000,
      100000
    ) / 100) * 100
  );
$$;

create or replace function app_private.calculate_borrower_used_credit(
  p_borrower_id uuid
)
returns numeric
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce((
      select sum(outstanding_balance)
      from public.active_loans
      where borrower_id = p_borrower_id
        and outstanding_balance > 0
    ), 0)
    +
    coalesce((
      select sum(requested_amount)
      from public.loan_applications
      where borrower_id = p_borrower_id
        and status in ('submitted', 'open')
    ), 0);
$$;

create or replace function app_private.calculate_borrower_used_credit_for_application(
  p_borrower_id uuid,
  p_excluded_application_id uuid
)
returns numeric
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce((
      select sum(outstanding_balance)
      from public.active_loans
      where borrower_id = p_borrower_id
        and outstanding_balance > 0
    ), 0)
    +
    coalesce((
      select sum(requested_amount)
      from public.loan_applications
      where borrower_id = p_borrower_id
        and status in ('submitted', 'open')
        and id <> p_excluded_application_id
    ), 0);
$$;

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
  v_safe_monthly_repayment_capacity numeric;
  v_income_based_capacity numeric;
  v_repayment_history_cap numeric;
  v_calculated_credit_limit numeric;
  v_used_credit numeric := 0;
  v_available_credit numeric;
  v_clean_completed_loan_count integer := 0;
  v_late_repayment_count integer := 0;
  v_defaulted_loan_count integer := 0;
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

    select count(*)::integer
    into v_defaulted_loan_count
    from public.active_loans
    where borrower_id = p_borrower_id
      and status = 'defaulted';

    select count(distinct loan_repayment_schedules.active_loan_id)::integer
    into v_late_repayment_count
    from public.loan_repayment_schedules
    where borrower_id = p_borrower_id
      and status = 'late';

    select count(*)::integer
    into v_clean_completed_loan_count
    from public.active_loans
    where borrower_id = p_borrower_id
      and status = 'paid'
      and not exists (
        select 1
        from public.loan_repayment_schedules
        where loan_repayment_schedules.active_loan_id = active_loans.id
          and loan_repayment_schedules.status = 'late'
      );
  end if;

  v_monthly_net_cash_flow :=
    coalesce(p_monthly_gross_revenue, 0)
    - coalesce(p_monthly_expenses, 0)
    - coalesce(v_household_expenses, 0)
    - coalesce(p_existing_loan_payments, 0);
  v_safe_monthly_repayment_capacity := greatest(0, v_monthly_net_cash_flow * 0.30);
  v_income_based_capacity := v_safe_monthly_repayment_capacity * 3;
  v_repayment_history_cap := app_private.calculate_borrower_repayment_history_cap(
    v_clean_completed_loan_count,
    v_late_repayment_count,
    v_defaulted_loan_count
  );
  v_calculated_credit_limit := greatest(
    0,
    floor(least(
      v_income_based_capacity,
      v_repayment_history_cap,
      100000
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
  if v_late_repayment_count > 0 then
    v_risk_flags := array_append(v_risk_flags, 'late_repayment_history');
  end if;
  if v_defaulted_loan_count > 0 then
    v_risk_flags := array_append(v_risk_flags, 'defaulted_repayment_history');
  end if;

  return jsonb_build_object(
    'calculated_credit_limit', v_calculated_credit_limit,
    'used_credit', v_used_credit,
    'available_credit', v_available_credit,
    'monthly_net_cash_flow', v_monthly_net_cash_flow,
    'safe_monthly_repayment_capacity', floor(v_safe_monthly_repayment_capacity / 100) * 100,
    'income_based_capacity', floor(v_income_based_capacity / 100) * 100,
    'repayment_history_cap', v_repayment_history_cap,
    'maximum_cap', 100000,
    'clean_completed_loan_count', v_clean_completed_loan_count,
    'late_repayment_count', v_late_repayment_count,
    'defaulted_loan_count', v_defaulted_loan_count,
    'risk_flags', to_jsonb(v_risk_flags)
  );
end;
$$;

create or replace function app_private.calculate_borrower_credit_limit_details_for_application(
  p_monthly_gross_revenue numeric,
  p_monthly_expenses numeric,
  p_existing_loan_payments numeric,
  p_years_in_operation numeric,
  p_borrower_id uuid,
  p_excluded_application_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_credit jsonb;
  v_used_credit numeric;
  v_available_credit numeric;
begin
  v_credit := app_private.calculate_borrower_credit_limit_details(
    p_monthly_gross_revenue,
    p_monthly_expenses,
    p_existing_loan_payments,
    p_years_in_operation,
    p_borrower_id
  );

  v_used_credit := app_private.calculate_borrower_used_credit_for_application(
    p_borrower_id,
    p_excluded_application_id
  );
  v_available_credit := greatest(
    0,
    (v_credit->>'calculated_credit_limit')::numeric - v_used_credit
  );

  return jsonb_set(
    jsonb_set(v_credit, '{used_credit}', to_jsonb(v_used_credit)),
    '{available_credit}',
    to_jsonb(v_available_credit)
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
  v_portfolio record;
  v_credit jsonb;
begin
  perform pg_advisory_xact_lock(hashtext(new.borrower_id::text));

  select
    id,
    borrower_id,
    monthly_gross_revenue,
    monthly_expenses,
    existing_loan_payments,
    years_in_operation
  into v_portfolio
  from public.borrower_portfolios
  where id = new.borrower_portfolio_id
    and borrower_id = new.borrower_id;

  if not found then
    raise exception 'Save your business profile before submitting an application.'
      using errcode = 'P0001';
  end if;

  v_credit := app_private.calculate_borrower_credit_limit_details_for_application(
    v_portfolio.monthly_gross_revenue,
    v_portfolio.monthly_expenses,
    v_portfolio.existing_loan_payments,
    v_portfolio.years_in_operation,
    new.borrower_id,
    new.id
  );

  if new.requested_amount > (v_credit->>'available_credit')::numeric then
    raise exception 'Requested amount exceeds your available credit.'
      using errcode = 'P0001';
  end if;

  new.credit_limit_at_submission := round((v_credit->>'calculated_credit_limit')::numeric, 2);
  new.used_credit_at_submission := round((v_credit->>'used_credit')::numeric, 2);
  new.available_credit_at_submission := round((v_credit->>'available_credit')::numeric, 2);
  new.monthly_net_cash_flow_at_submission := round((v_credit->>'monthly_net_cash_flow')::numeric, 2);

  return new;
end;
$$;
