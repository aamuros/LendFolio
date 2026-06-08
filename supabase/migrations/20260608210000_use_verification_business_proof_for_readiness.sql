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
        and status in ('active', 'overdue')
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

create or replace function app_private.calculate_borrower_used_credit_excluding_application(
  p_borrower_id uuid,
  p_excluded_application_id uuid default null
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
        and status in ('active', 'overdue')
        and outstanding_balance > 0
    ), 0)
    +
    coalesce((
      select sum(requested_amount)
      from public.loan_applications
      where borrower_id = p_borrower_id
        and status in ('submitted', 'open')
        and (
          p_excluded_application_id is null
          or id <> p_excluded_application_id
        )
    ), 0);
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
  v_has_accepted_business_proof boolean := false;
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

  select exists (
    select 1
    from public.borrower_verifications bv
    join public.borrower_verification_documents bvd
      on bvd.borrower_verification_id = bv.id
    where bv.borrower_id = p_borrower_id
      and bv.verification_status = 'approved'
      and bvd.document_type = 'business_proof'
      and bvd.status = 'accepted'
  ) into v_has_accepted_business_proof;

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
  if not v_portfolio.asset_declaration_completed then
    v_missing := array_append(v_missing, 'Asset declaration');
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
  if not v_has_accepted_business_proof then
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
