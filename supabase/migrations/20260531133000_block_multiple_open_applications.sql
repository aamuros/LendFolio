-- Block multiple open loan applications per borrower.
-- 1. Update calculate_borrower_used_credit to include pending application amounts.
-- 2. Block new submission if borrower already has a submitted/open application.
-- 3. Update enforce_loan_application_credit_limit trigger to include pending apps.
-- 4. Add credit re-check in accept_loan_offer as defense-in-depth.

-- 1. Update used credit to include pending application committed amounts.
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
    coalesce(
      (select sum(outstanding_balance)
       from public.active_loans
       where borrower_id = p_borrower_id
         and outstanding_balance > 0),
      0
    )
    + coalesce(
      (select sum(requested_amount)
       from public.loan_applications
       where borrower_id = p_borrower_id
         and status in ('submitted', 'open')),
      0
    );
$$;

-- 2. Update trigger to use the enriched used credit calculation
--    and also block multiple open applications at the trigger level.
create or replace function app_private.enforce_loan_application_credit_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_portfolio record;
  v_credit_limit numeric;
  v_used_credit numeric;
  v_available_credit numeric;
  v_pending_app_count integer;
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

  if tg_op = 'INSERT' then
    select count(*)
    into v_pending_app_count
    from public.loan_applications
    where borrower_id = new.borrower_id
      and status in ('submitted', 'open');

    if v_pending_app_count > 0 then
      raise exception 'You already have an open application. Withdraw it before submitting a new one.'
        using errcode = 'P0001';
    end if;
  end if;

  v_credit_limit := app_private.calculate_borrower_credit_limit(
    v_portfolio.monthly_gross_revenue,
    v_portfolio.monthly_expenses,
    v_portfolio.existing_loan_payments,
    v_portfolio.years_in_operation
  );
  v_used_credit := app_private.calculate_borrower_used_credit(new.borrower_id);
  v_available_credit := greatest(0, v_credit_limit - v_used_credit);

  if new.requested_amount > v_available_credit then
    raise exception 'Requested amount exceeds your available credit.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- 3. Update submit_loan_application to block multiple open applications.
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
  v_pending_app_count integer;
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

  select count(*)
  into v_pending_app_count
  from public.loan_applications
  where borrower_id = v_actor_id
    and status in ('submitted', 'open');

  if v_pending_app_count > 0 then
    return jsonb_build_object(
      'ok', false,
      'code', 'active_application',
      'message', 'You already have an open application. Withdraw it before submitting a new one.'
    );
  end if;

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
end;
$$;

create or replace function public.submit_loan_application(
  p_requested_amount numeric,
  p_purpose text,
  p_preferred_term public.preferred_term,
  p_remarks text default null
)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.submit_loan_application(
    p_requested_amount,
    p_purpose,
    p_preferred_term,
    p_remarks
  );
$$;

-- 4. Add credit re-check in accept_loan_offer as defense-in-depth.
create or replace function app_private.accept_loan_offer(p_offer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_application_id uuid;
  v_offer record;
  v_active_loan_id uuid;
  v_existing_active_loan_id uuid;
  v_declined_count integer := 0;
  v_schedule_inserted_count integer := 0;
  v_installment_count integer := 1;
  v_installment_number integer;
  v_regular_amount numeric(12, 2);
  v_installment_amount numeric(12, 2);
  v_installment_due_date date;
  v_loan_created boolean := false;
  v_credit_limit numeric;
  v_other_used_credit numeric;
  v_available_credit numeric;
  v_portfolio record;
begin
  if v_actor_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Sign in to continue.'
    );
  end if;

  select loan_application_id
  into v_application_id
  from public.loan_offers
  where id = p_offer_id;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not accept this offer.'
    );
  end if;

  perform pg_advisory_xact_lock(hashtext(v_application_id::text));

  select
    loan_offers.id,
    loan_offers.loan_application_id,
    loan_offers.borrower_id,
    loan_offers.lender_id,
    loan_offers.approved_amount,
    loan_offers.repayment_amount,
    loan_offers.fees,
    loan_offers.due_date,
    loan_offers.status as offer_status,
    loan_applications.status as application_status,
    loan_applications.preferred_term,
    loan_applications.borrower_portfolio_id
  into v_offer
  from public.loan_applications
  join public.loan_offers
    on loan_offers.loan_application_id = loan_applications.id
  where loan_offers.id = p_offer_id
  for update of loan_applications, loan_offers;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not accept this offer.'
    );
  end if;

  if v_offer.borrower_id <> v_actor_id then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not accept this offer.'
    );
  end if;

  select id
  into v_existing_active_loan_id
  from public.active_loans
  where loan_application_id = v_offer.loan_application_id
    and accepted_offer_id = v_offer.id;

  if v_offer.offer_status = 'accepted'
    and v_offer.application_status = 'accepted'
    and v_existing_active_loan_id is not null
  then
    return jsonb_build_object(
      'ok', true,
      'message', 'Offer already accepted.',
      'loan_application_id', v_offer.loan_application_id,
      'accepted_offer_id', v_offer.id,
      'active_loan_id', v_existing_active_loan_id,
      'declined_offer_count', 0
    );
  end if;

  if v_offer.offer_status <> 'pending' then
    return jsonb_build_object(
      'ok', false,
      'message', 'This offer is no longer pending.'
    );
  end if;

  if v_offer.application_status not in ('submitted', 'open') then
    return jsonb_build_object(
      'ok', false,
      'message', 'This application is no longer open.'
    );
  end if;

  select
    borrower_portfolios.monthly_gross_revenue,
    borrower_portfolios.monthly_expenses,
    borrower_portfolios.existing_loan_payments,
    borrower_portfolios.years_in_operation
  into v_portfolio
  from public.borrower_portfolios
  where borrower_portfolios.id = v_offer.borrower_portfolio_id;

  if found then
    v_credit_limit := app_private.calculate_borrower_credit_limit(
      v_portfolio.monthly_gross_revenue,
      v_portfolio.monthly_expenses,
      v_portfolio.existing_loan_payments,
      v_portfolio.years_in_operation
    );

    select coalesce(sum(outstanding_balance), 0)
    into v_other_used_credit
    from public.active_loans
    where borrower_id = v_actor_id
      and outstanding_balance > 0;

    v_available_credit := greatest(0, v_credit_limit - v_other_used_credit);

    if v_offer.approved_amount > v_available_credit then
      return jsonb_build_object(
        'ok', false,
        'message', 'Accepting this offer would exceed your credit limit.'
      );
    end if;
  end if;

  v_installment_count := case v_offer.preferred_term
    when '1_month' then 1
    when '3_months' then 3
    when '6_months' then 6
    when '12_months' then 12
    else 1
  end;
  v_regular_amount := round(v_offer.repayment_amount / v_installment_count, 2);

  update public.loan_offers
  set
    status = 'accepted',
    updated_at = now()
  where id = v_offer.id;

  update public.loan_offers
  set
    status = 'declined',
    updated_at = now()
  where loan_application_id = v_offer.loan_application_id
    and id <> v_offer.id
    and status = 'pending';

  get diagnostics v_declined_count = row_count;

  update public.loan_applications
  set
    status = 'accepted',
    updated_at = now()
  where id = v_offer.loan_application_id
    and borrower_id = v_actor_id
    and status in ('submitted', 'open');

  insert into public.active_loans (
    loan_application_id,
    accepted_offer_id,
    borrower_id,
    lender_id,
    principal_amount,
    repayment_amount,
    fees,
    outstanding_balance,
    status,
    due_date
  )
  values (
    v_offer.loan_application_id,
    v_offer.id,
    v_offer.borrower_id,
    v_offer.lender_id,
    v_offer.approved_amount,
    v_offer.repayment_amount,
    v_offer.fees,
    v_offer.repayment_amount,
    'active',
    v_offer.due_date
  )
  on conflict (loan_application_id) do nothing
  returning id into v_active_loan_id;

  if v_active_loan_id is not null then
    v_loan_created := true;
  else
    select id
    into v_active_loan_id
    from public.active_loans
    where loan_application_id = v_offer.loan_application_id
      and accepted_offer_id = v_offer.id;
  end if;

  if v_active_loan_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'This application already has an active loan.'
    );
  end if;

  for v_installment_number in 1..v_installment_count loop
    if v_installment_number = v_installment_count then
      v_installment_amount :=
        v_offer.repayment_amount - (v_regular_amount * (v_installment_count - 1));
    else
      v_installment_amount := v_regular_amount;
    end if;

    v_installment_due_date :=
      (v_offer.due_date::timestamp
        - ((v_installment_count - v_installment_number) || ' months')::interval
      )::date;

    insert into public.loan_repayment_schedules (
      active_loan_id,
      borrower_id,
      lender_id,
      installment_number,
      amount_due,
      due_date,
      status
    )
    values (
      v_active_loan_id,
      v_offer.borrower_id,
      v_offer.lender_id,
      v_installment_number,
      v_installment_amount,
      v_installment_due_date,
      'due'
    )
    on conflict (active_loan_id, installment_number) do nothing;

    if found then
      v_schedule_inserted_count := v_schedule_inserted_count + 1;
    end if;
  end loop;

  perform app_private.write_audit_log(
    'offer_accepted',
    'loan_offers',
    v_offer.id,
    jsonb_build_object('loan_application_id', v_offer.loan_application_id)
  );

  if v_declined_count > 0 then
    perform app_private.write_audit_log(
      'competing_offers_declined',
      'loan_applications',
      v_offer.loan_application_id,
      jsonb_build_object('declined_count', v_declined_count)
    );
  end if;

  perform app_private.write_audit_log(
    'application_accepted',
    'loan_applications',
    v_offer.loan_application_id,
    jsonb_build_object('accepted_offer_id', v_offer.id)
  );

  if v_loan_created then
    perform app_private.write_audit_log(
      'loan_activated',
      'active_loans',
      v_active_loan_id,
      jsonb_build_object(
        'loan_application_id', v_offer.loan_application_id,
        'accepted_offer_id', v_offer.id
      )
    );
  end if;

  if v_schedule_inserted_count > 0 then
    perform app_private.write_audit_log(
      'repayment_schedule_created',
      'loan_repayment_schedules',
      v_active_loan_id,
      jsonb_build_object(
        'loan_application_id', v_offer.loan_application_id,
        'accepted_offer_id', v_offer.id,
        'installment_count', v_schedule_inserted_count
      )
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'message', 'Offer accepted. Active loan created.',
    'loan_application_id', v_offer.loan_application_id,
    'accepted_offer_id', v_offer.id,
    'active_loan_id', v_active_loan_id,
    'declined_offer_count', v_declined_count
  );
end;
$$;

grant execute on function app_private.submit_loan_application(
  numeric, text, public.preferred_term, text
) to authenticated;
grant execute on function public.submit_loan_application(
  numeric, text, public.preferred_term, text
) to authenticated;
