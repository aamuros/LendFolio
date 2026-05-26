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
  if v_portfolio.loan_purpose_context is null or char_length(btrim(v_portfolio.loan_purpose_context)) < 20 then
    v_missing := array_append(v_missing, 'Loan-use context');
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
