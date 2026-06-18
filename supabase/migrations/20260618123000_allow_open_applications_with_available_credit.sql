-- Allow multiple open/submitted borrower applications while enforcing the
-- remaining credit line for new submissions and edits.

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
    coalesce(nullif(v_readiness->>'readiness_status', ''), 'eligible_to_apply')::public.borrower_credit_readiness_status,
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
