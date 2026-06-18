-- Keep borrower credit display and application validation on one DB snapshot.

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
    where borrower_id = p_borrower_id
    order by updated_at desc nulls last, created_at desc nulls last
    limit 1;

    select count(*)::integer
    into v_defaulted_loan_count
    from public.active_loans
    where borrower_id = p_borrower_id
      and status = 'defaulted';

    select count(distinct loan_repayment_schedules.active_loan_id)::integer
    into v_late_repayment_count
    from public.loan_repayment_schedules
    where borrower_id = p_borrower_id
      and was_late = true;

    select count(*)::integer
    into v_clean_completed_loan_count
    from public.active_loans
    where borrower_id = p_borrower_id
      and status in ('paid', 'closed')
      and outstanding_balance <= 0
      and status <> 'defaulted'
      and not exists (
        select 1
        from public.loan_repayment_schedules
        where loan_repayment_schedules.active_loan_id = active_loans.id
          and loan_repayment_schedules.was_late = true
      )
      and not exists (
        select 1
        from public.repayment_proofs
        join public.loan_repayment_schedules
          on loan_repayment_schedules.id = repayment_proofs.repayment_schedule_id
        where repayment_proofs.active_loan_id = active_loans.id
          and repayment_proofs.status = 'verified'
          and repayment_proofs.reviewed_at::date > loan_repayment_schedules.due_date
      );
  end if;

  v_monthly_net_cash_flow :=
    coalesce(p_monthly_gross_revenue, 0)
    - coalesce(p_monthly_expenses, 0)
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

create or replace function public.get_my_borrower_credit_snapshot(
  p_excluded_application_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_credit jsonb;
begin
  if v_actor_id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'auth_required',
      'message', 'Sign in to continue.'
    );
  end if;

  if not app_private.is_borrower(v_actor_id) then
    return jsonb_build_object(
      'ok', false,
      'code', 'not_allowed',
      'message', 'Unable to verify your latest credit limit. Please refresh and try again.'
    );
  end if;

  v_credit := app_private.get_borrower_credit_snapshot(
    v_actor_id,
    p_excluded_application_id
  );

  if coalesce((v_credit->>'ok')::boolean, false) is false then
    return jsonb_build_object(
      'ok', false,
      'code', coalesce(v_credit->>'code', 'credit_snapshot_unavailable'),
      'message', 'Unable to verify your latest credit limit. Please refresh and try again.'
    );
  end if;

  return v_credit;
end;
$$;

grant execute on function public.get_my_borrower_credit_snapshot(uuid) to authenticated;
