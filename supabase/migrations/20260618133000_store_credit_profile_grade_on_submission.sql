-- Store borrower credit profile grade snapshots when a loan application is submitted.

alter table public.loan_applications
  add column if not exists borrower_credit_profile_grade text,
  add column if not exists borrower_credit_profile_assessment jsonb;

create or replace function app_private.build_borrower_credit_profile_assessment(
  p_readiness jsonb,
  p_credit jsonb,
  p_portfolio public.borrower_portfolios
)
returns jsonb
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_readiness_status text := coalesce(nullif(p_readiness->>'readiness_status', ''), 'eligible_to_apply');
  v_available_credit numeric := coalesce((p_credit->>'available_credit')::numeric, 0);
  v_credit_limit numeric := coalesce((p_credit->>'calculated_credit_limit')::numeric, 0);
  v_used_credit numeric := coalesce((p_credit->>'used_credit')::numeric, 0);
  v_monthly_net_cash_flow numeric := coalesce((p_credit->>'monthly_net_cash_flow')::numeric, 0);
  v_debt_burden_ratio numeric := null;
  v_risk_flags jsonb := coalesce(p_readiness->'profile_readiness'->'risk_flags', '[]'::jsonb);
  v_grade text;
  v_label text;
  v_summary text;
  v_positive_factors jsonb := '[]'::jsonb;
  v_risk_factors jsonb := '[]'::jsonb;
  v_improvement_actions jsonb := '[]'::jsonb;
  v_deductions integer := 0;
begin
  if coalesce(p_portfolio.monthly_gross_revenue, 0) > 0 then
    v_debt_burden_ratio := coalesce(p_portfolio.existing_loan_payments, 0) / p_portfolio.monthly_gross_revenue;
  end if;

  if v_readiness_status = 'incomplete' then
    v_grade := 'incomplete';
    v_risk_factors := jsonb_build_array('Required profile or verification information is missing.');
    v_improvement_actions := jsonb_build_array('Complete the missing profile or verification requirements.');
  elsif v_readiness_status = 'not_eligible' or v_available_credit <= 0 then
    v_grade := 'not_eligible';
    if v_available_credit <= 0 then
      v_risk_factors := v_risk_factors || jsonb_build_array('No available credit remaining.');
    end if;
    if v_monthly_net_cash_flow <= 0 then
      v_risk_factors := v_risk_factors || jsonb_build_array('Monthly net cash flow is not positive.');
    end if;
    v_improvement_actions := jsonb_build_array('Resolve blocking credit or account issues before applying.');
  elsif v_readiness_status in ('needs_review', 'complete') then
    v_grade := 'review_needed';
    if v_monthly_net_cash_flow > 0 then
      v_positive_factors := v_positive_factors || jsonb_build_array('Monthly net cash flow is positive.');
    end if;
    if v_debt_burden_ratio is not null and v_debt_burden_ratio < 0.3 then
      v_positive_factors := v_positive_factors || jsonb_build_array('Debt burden ratio is manageable.');
    end if;
    v_improvement_actions := jsonb_build_array('Review the submitted profile snapshot before making an offer.');
  else
    if v_monthly_net_cash_flow > 0 then
      v_positive_factors := v_positive_factors || jsonb_build_array('Positive monthly net cash flow.');
    end if;
    if v_debt_burden_ratio is not null and v_debt_burden_ratio < 0.2 then
      v_positive_factors := v_positive_factors || jsonb_build_array('Low debt burden ratio.');
    elsif v_debt_burden_ratio is not null and v_debt_burden_ratio < 0.3 then
      v_positive_factors := v_positive_factors || jsonb_build_array('Manageable debt burden ratio.');
    elsif v_debt_burden_ratio is not null and v_debt_burden_ratio >= 0.3 then
      v_deductions := v_deductions + 1;
      v_risk_factors := v_risk_factors || jsonb_build_array('Debt burden ratio is moderate to high.');
      v_improvement_actions := v_improvement_actions || jsonb_build_array('Reduce existing loan payments to improve your profile.');
    end if;
    if coalesce(p_portfolio.profile_review_status, '') = 'approved' then
      v_positive_factors := v_positive_factors || jsonb_build_array('Borrower verification approved.');
    end if;
    if coalesce(p_portfolio.revenue_confidence, '') in ('document_supported', 'manager_reviewed') then
      v_positive_factors := v_positive_factors || jsonb_build_array('Revenue is document-supported or manager-reviewed.');
    else
      v_deductions := v_deductions + 1;
      v_risk_factors := v_risk_factors || jsonb_build_array('Revenue is self-declared and not document-supported.');
      v_improvement_actions := v_improvement_actions || jsonb_build_array('Upload supporting documents to strengthen your revenue claims.');
    end if;
    if coalesce(p_portfolio.years_in_operation, 0) >= 2 then
      v_positive_factors := v_positive_factors || jsonb_build_array('Established business with 2+ years in operation.');
    elsif coalesce(p_portfolio.years_in_operation, 0) < 1 then
      v_deductions := v_deductions + 1;
      v_risk_factors := v_risk_factors || jsonb_build_array('Business is relatively new.');
    end if;
    if v_credit_limit > 0 and (v_used_credit / v_credit_limit) >= 0.7 then
      v_deductions := v_deductions + 1;
      v_risk_factors := v_risk_factors || jsonb_build_array('Used credit is consuming most of the available credit limit.');
    end if;

    if v_deductions = 0 then
      v_grade := 'A';
    elsif v_deductions <= 1 then
      v_grade := 'B';
    else
      v_grade := 'C';
    end if;
  end if;

  v_label := case v_grade
    when 'A' then 'Strong profile'
    when 'B' then 'Acceptable profile'
    when 'C' then 'Review recommended'
    when 'review_needed' then 'Review needed'
    when 'not_eligible' then 'Not eligible'
    else 'Incomplete profile'
  end;

  v_summary := case v_grade
    when 'A' then 'This borrower has a strong profile with positive cash flow, low debt burden, and verified information.'
    when 'B' then 'This borrower has an acceptable profile with minor risk signals. Review risk notes before offering.'
    when 'C' then 'This borrower is eligible but has notable risk signals. Careful review is recommended.'
    when 'review_needed' then 'This profile requires additional review or borrower action before an offer decision.'
    when 'not_eligible' then 'A hard blocker prevents this borrower from entering the offer workflow.'
    else 'Required profile or verification information is missing.'
  end;

  return jsonb_build_object(
    'grade', v_grade,
    'label', v_label,
    'summary', v_summary,
    'positiveFactors', v_positive_factors,
    'riskFactors', v_risk_factors,
    'improvementActions', v_improvement_actions,
    'inputs', jsonb_build_object(
      'readinessStatus', v_readiness_status,
      'monthlyNetCashFlow', v_monthly_net_cash_flow,
      'debtBurdenRatio', v_debt_burden_ratio,
      'availableCredit', v_available_credit,
      'calculatedCreditLimit', v_credit_limit,
      'usedCredit', v_used_credit,
      'yearsInOperation', p_portfolio.years_in_operation,
      'revenueConfidence', p_portfolio.revenue_confidence,
      'verificationStatus', p_portfolio.profile_review_status,
      'profileIsStale', false
    ),
    'source', 'submission'
  );
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
  v_credit_profile_assessment jsonb;
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

  v_credit_profile_assessment := app_private.build_borrower_credit_profile_assessment(
    v_readiness,
    v_credit,
    v_portfolio
  );

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
    borrower_readiness_snapshot,
    borrower_credit_profile_grade,
    borrower_credit_profile_assessment
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
    coalesce(nullif(v_readiness->>'readiness_status', ''), 'eligible_to_apply')::public.borrower_credit_readiness_status,
    to_jsonb(v_portfolio),
    v_readiness,
    v_credit_profile_assessment->>'grade',
    v_credit_profile_assessment
  )
  returning id, borrower_id, borrower_portfolio_id, requested_amount, purpose,
    preferred_term, remarks, status, submitted_at, created_at, updated_at,
    credit_limit_at_submission, used_credit_at_submission,
    available_credit_at_submission, monthly_net_cash_flow_at_submission,
    credit_readiness_status, borrower_profile_snapshot, borrower_readiness_snapshot,
    borrower_credit_profile_grade, borrower_credit_profile_assessment
  into v_application;

  perform app_private.write_audit_log(
    'loan_application_submitted_with_profile_snapshot',
    'loan_applications',
    v_application.id,
    jsonb_build_object(
      'borrower_id', v_actor_id,
      'credit_readiness_status', v_application.credit_readiness_status,
      'credit_profile_grade', v_application.borrower_credit_profile_grade,
      'risk_flags', v_readiness->'profile_readiness'->'risk_flags',
      'available_credit', v_application.available_credit_at_submission
    )
  );

  perform app_private.try_create_notification(
    lender_profiles.user_id,
    'application_submitted',
    'New loan application',
    'A borrower submitted a new loan application for review.',
    '/lender/applications/' || v_application.id::text
  )
  from public.lender_profiles
  where lender_profiles.verification_status = 'approved';

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
  when raise_exception then
    return jsonb_build_object('ok', false, 'code', 'credit_limit_exceeded', 'message', sqlerrm);
end;
$$;
