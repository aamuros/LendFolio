-- Use the same latest borrower credit snapshot for application submission,
-- application edits, and the loan_applications trigger.

create or replace function app_private.get_borrower_credit_snapshot(
  p_borrower_id uuid,
  p_excluded_application_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_portfolio record;
  v_credit jsonb;
  v_used_credit numeric;
  v_available_credit numeric;
begin
  select
    borrower_portfolios.monthly_gross_revenue,
    borrower_portfolios.monthly_expenses,
    borrower_portfolios.existing_loan_payments,
    borrower_portfolios.years_in_operation
  into v_portfolio
  from public.borrower_portfolios
  where borrower_portfolios.borrower_id = p_borrower_id
  order by borrower_portfolios.updated_at desc nulls last,
    borrower_portfolios.created_at desc nulls last
  limit 1;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'code', 'credit_snapshot_unavailable',
      'message', 'Unable to verify your latest credit limit. Please refresh and try again.'
    );
  end if;

  v_credit := app_private.calculate_borrower_credit_limit_details(
    v_portfolio.monthly_gross_revenue,
    v_portfolio.monthly_expenses,
    v_portfolio.existing_loan_payments,
    v_portfolio.years_in_operation,
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

  return v_credit || jsonb_build_object(
    'ok', true,
    'current_credit_limit', (v_credit->>'calculated_credit_limit')::numeric,
    'calculated_credit_limit', (v_credit->>'calculated_credit_limit')::numeric,
    'active_principal_used', coalesce((
      select sum(principal_amount)
      from public.active_loans
      where borrower_id = p_borrower_id
        and status in ('active', 'overdue')
        and outstanding_balance > 0
    ), 0),
    'pending_application_credit', coalesce((
      select sum(requested_amount)
      from public.loan_applications
      where borrower_id = p_borrower_id
        and status in ('submitted', 'open')
        and (
          p_excluded_application_id is null
          or id <> p_excluded_application_id
        )
    ), 0),
    'used_credit', v_used_credit,
    'available_credit', v_available_credit
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
  v_credit jsonb;
begin
  perform pg_advisory_xact_lock(hashtext(new.borrower_id::text));

  v_credit := app_private.get_borrower_credit_snapshot(new.borrower_id, new.id);

  if coalesce((v_credit->>'ok')::boolean, false) is false then
    raise exception 'Unable to verify your latest credit limit. Please refresh and try again.'
      using errcode = 'P0001';
  end if;

  if new.requested_amount > (v_credit->>'available_credit')::numeric then
    raise exception 'Requested amount exceeds your available credit. Maximum request: PHP %.',
      to_char((v_credit->>'available_credit')::numeric, 'FM999,999,999')
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
  where borrower_id = v_actor_id
  order by updated_at desc nulls last, created_at desc nulls last
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'profile_required', 'message', 'Save your business profile before submitting an application.');
  end if;

  v_credit := app_private.get_borrower_credit_snapshot(v_actor_id, null);

  if coalesce((v_credit->>'ok')::boolean, false) is false then
    return jsonb_build_object(
      'ok', false,
      'code', coalesce(v_credit->>'code', 'credit_snapshot_unavailable'),
      'message', 'Unable to verify your latest credit limit. Please refresh and try again.'
    );
  end if;

  if p_requested_amount > (v_credit->>'available_credit')::numeric then
    return jsonb_build_object(
      'ok', false,
      'code', 'credit_limit_exceeded',
      'message', 'Requested amount exceeds your available credit. Maximum request: PHP '
        || to_char((v_credit->>'available_credit')::numeric, 'FM999,999,999') || '.',
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
    if sqlerrm = 'Unable to verify your latest credit limit. Please refresh and try again.' then
      return jsonb_build_object('ok', false, 'code', 'credit_snapshot_unavailable', 'message', sqlerrm);
    end if;

    return jsonb_build_object('ok', false, 'code', 'credit_limit_exceeded', 'message', sqlerrm);
end;
$$;

create or replace function app_private.update_loan_application(
  p_application_id uuid,
  p_requested_amount numeric,
  p_purpose text,
  p_preferred_term public.preferred_term,
  p_remarks text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_application record;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'code', 'auth_required', 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_borrower(v_actor_id) then
    return jsonb_build_object('ok', false, 'code', 'not_allowed', 'message', 'Could not save changes.');
  end if;

  if p_requested_amount is null
    or p_requested_amount < 1000
    or p_requested_amount > 1000000 then
    return jsonb_build_object('ok', false, 'code', 'invalid_amount', 'message', 'Review the highlighted fields before saving.');
  end if;

  if p_purpose is null
    or char_length(btrim(p_purpose)) < 10
    or char_length(btrim(p_purpose)) > 160 then
    return jsonb_build_object('ok', false, 'code', 'invalid_purpose', 'message', 'Review the highlighted fields before saving.');
  end if;

  if p_preferred_term is null then
    return jsonb_build_object('ok', false, 'code', 'invalid_term', 'message', 'Review the highlighted fields before saving.');
  end if;

  if p_remarks is not null and char_length(btrim(p_remarks)) > 500 then
    return jsonb_build_object('ok', false, 'code', 'invalid_remarks', 'message', 'Review the highlighted fields before saving.');
  end if;

  select
    id,
    borrower_id,
    status
  into v_application
  from public.loan_applications
  where id = p_application_id
  for update;

  if not found or v_application.borrower_id <> v_actor_id then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'Could not save changes.');
  end if;

  perform pg_advisory_xact_lock(hashtext(v_actor_id::text));

  if v_application.status not in ('submitted', 'open') then
    return jsonb_build_object(
      'ok', false,
      'code', 'application_closed',
      'message', 'This application can no longer be edited.'
    );
  end if;

  update public.loan_applications
  set
    requested_amount = round(p_requested_amount, 2),
    purpose = btrim(p_purpose),
    preferred_term = p_preferred_term,
    remarks = nullif(btrim(coalesce(p_remarks, '')), ''),
    updated_at = now()
  where id = p_application_id
  returning id, borrower_id, borrower_portfolio_id, requested_amount, purpose,
    preferred_term, remarks, status, submitted_at, created_at, updated_at,
    credit_limit_at_submission, used_credit_at_submission,
    available_credit_at_submission, monthly_net_cash_flow_at_submission,
    credit_readiness_status, borrower_profile_snapshot, borrower_readiness_snapshot,
    borrower_credit_profile_grade, borrower_credit_profile_assessment
  into v_application;

  perform app_private.write_audit_log(
    'application_updated',
    'loan_applications',
    p_application_id,
    jsonb_build_object(
      'status', v_application.status,
      'available_credit', v_application.available_credit_at_submission
    )
  );

  perform app_private.try_create_notification(
    loan_offers.lender_id,
    'application_updated',
    'Application updated',
    'A borrower updated their loan application. Review the changes.',
    '/lender/applications/' || p_application_id::text
  )
  from public.loan_offers
  where loan_offers.loan_application_id = p_application_id
    and loan_offers.status = 'pending';

  return jsonb_build_object(
    'ok', true,
    'message', 'Application updated.',
    'application', to_jsonb(v_application)
  );
exception
  when check_violation or not_null_violation then
    return jsonb_build_object('ok', false, 'code', 'invalid_application', 'message', 'Review the highlighted fields before saving.');
  when raise_exception then
    if sqlerrm = 'Unable to verify your latest credit limit. Please refresh and try again.' then
      return jsonb_build_object('ok', false, 'code', 'credit_snapshot_unavailable', 'message', sqlerrm);
    end if;

    return jsonb_build_object('ok', false, 'code', 'credit_limit_exceeded', 'message', sqlerrm);
end;
$$;

grant execute on function app_private.get_borrower_credit_snapshot(uuid, uuid) to authenticated;
