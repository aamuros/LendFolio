alter table public.loan_applications
  add column if not exists credit_limit_at_submission numeric(12, 2),
  add column if not exists used_credit_at_submission numeric(12, 2),
  add column if not exists available_credit_at_submission numeric(12, 2);

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

  if tg_op = 'INSERT' then
    new.credit_limit_at_submission := round(v_credit_limit, 2);
    new.used_credit_at_submission := round(v_used_credit, 2);
    new.available_credit_at_submission := round(v_available_credit, 2);
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
  v_available_credit numeric;
  v_credit_limit numeric;
  v_portfolio record;
  v_used_credit numeric;
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
      'message', 'Could not submit application.'
    );
  end if;

  if p_requested_amount is null
    or p_requested_amount < 1000
    or p_requested_amount > 1000000
  then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_amount',
      'message', 'Review the highlighted fields before submitting.'
    );
  end if;

  if p_purpose is null
    or char_length(btrim(p_purpose)) < 10
    or char_length(btrim(p_purpose)) > 160
  then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_purpose',
      'message', 'Review the highlighted fields before submitting.'
    );
  end if;

  if p_preferred_term is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_term',
      'message', 'Review the highlighted fields before submitting.'
    );
  end if;

  if p_remarks is not null and char_length(btrim(p_remarks)) > 500 then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_remarks',
      'message', 'Review the highlighted fields before submitting.'
    );
  end if;

  perform pg_advisory_xact_lock(hashtext(v_actor_id::text));

  select
    id,
    monthly_gross_revenue,
    monthly_expenses,
    existing_loan_payments,
    years_in_operation
  into v_portfolio
  from public.borrower_portfolios
  where borrower_id = v_actor_id;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'code', 'missing_portfolio',
      'message', 'Save your business profile before submitting an application.'
    );
  end if;

  v_credit_limit := app_private.calculate_borrower_credit_limit(
    v_portfolio.monthly_gross_revenue,
    v_portfolio.monthly_expenses,
    v_portfolio.existing_loan_payments,
    v_portfolio.years_in_operation
  );
  v_used_credit := app_private.calculate_borrower_used_credit(v_actor_id);
  v_available_credit := greatest(0, v_credit_limit - v_used_credit);

  if p_requested_amount > v_available_credit then
    return jsonb_build_object(
      'ok', false,
      'code', 'credit_limit_exceeded',
      'message', 'Requested amount exceeds your available credit.',
      'credit_limit', v_credit_limit,
      'used_credit', v_used_credit,
      'available_credit', v_available_credit
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
    available_credit_at_submission
  )
  values (
    v_actor_id,
    v_portfolio.id,
    round(p_requested_amount, 2),
    btrim(p_purpose),
    p_preferred_term,
    nullif(btrim(coalesce(p_remarks, '')), ''),
    'submitted',
    round(v_credit_limit, 2),
    round(v_used_credit, 2),
    round(v_available_credit, 2)
  )
  returning id, borrower_id, borrower_portfolio_id, requested_amount, purpose,
    preferred_term, remarks, status, submitted_at, created_at, updated_at,
    credit_limit_at_submission, used_credit_at_submission,
    available_credit_at_submission
  into v_application;

  return jsonb_build_object(
    'ok', true,
    'message', 'Application submitted.',
    'application', to_jsonb(v_application),
    'credit_limit', v_credit_limit,
    'used_credit', v_used_credit,
    'available_credit', v_available_credit
  );
exception
  when check_violation then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_application',
      'message', 'Review the highlighted fields before submitting.'
    );
  when not_null_violation then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_application',
      'message', 'Review the highlighted fields before submitting.'
    );
  when raise_exception then
    if sqlerrm = 'Requested amount exceeds your available credit.' then
      return jsonb_build_object(
        'ok', false,
        'code', 'credit_limit_exceeded',
        'message', 'Requested amount exceeds your available credit.'
      );
    end if;

    return jsonb_build_object(
      'ok', false,
      'code', 'missing_portfolio',
      'message', 'Save your business profile before submitting an application.'
    );
end;
$$;

create or replace function app_private.create_loan_offer(
  p_loan_application_id uuid,
  p_approved_amount numeric,
  p_repayment_amount numeric,
  p_fees numeric,
  p_due_date date,
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
  v_lender_name text;
  v_offer_id uuid;
begin
  if v_actor_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Sign in to continue.'
    );
  end if;

  if not app_private.is_approved_lender(v_actor_id) then
    return jsonb_build_object(
      'ok', false,
      'message', 'Only approved lenders can send offers.'
    );
  end if;

  if p_loan_application_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Choose an application before sending an offer.'
    );
  end if;

  if p_approved_amount is null
    or p_approved_amount < 1000
    or p_approved_amount > 1000000
  then
    return jsonb_build_object(
      'ok', false,
      'message', 'Approved amount must be between PHP 1,000 and PHP 1,000,000.'
    );
  end if;

  if p_repayment_amount is null
    or p_repayment_amount < 1000
    or p_repayment_amount > 1500000
  then
    return jsonb_build_object(
      'ok', false,
      'message', 'Repayment amount must be between PHP 1,000 and PHP 1,500,000.'
    );
  end if;

  if p_fees is null or p_fees < 0 or p_fees > 500000 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Fees must be between PHP 0 and PHP 500,000.'
    );
  end if;

  if p_repayment_amount < p_approved_amount then
    return jsonb_build_object(
      'ok', false,
      'message', 'Repayment amount must be at least the approved amount.'
    );
  end if;

  if p_fees > p_repayment_amount then
    return jsonb_build_object(
      'ok', false,
      'message', 'Fees cannot exceed the repayment amount.'
    );
  end if;

  if p_due_date is null or p_due_date <= current_date then
    return jsonb_build_object(
      'ok', false,
      'message', 'Choose a future due date.'
    );
  end if;

  if p_remarks is not null and char_length(p_remarks) > 500 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Keep remarks under 500 characters.'
    );
  end if;

  select
    loan_applications.id,
    loan_applications.borrower_id,
    loan_applications.requested_amount,
    loan_applications.status
  into v_application
  from public.loan_applications
  where loan_applications.id = p_loan_application_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'This application is not available for offers.'
    );
  end if;

  if p_approved_amount > v_application.requested_amount then
    return jsonb_build_object(
      'ok', false,
      'message', 'Approved amount cannot exceed the requested amount.'
    );
  end if;

  if v_application.status not in ('submitted', 'open') then
    return jsonb_build_object(
      'ok', false,
      'message', 'This application is not open for offers.'
    );
  end if;

  if exists (
    select 1
    from public.loan_offers
    where loan_application_id = v_application.id
      and status = 'accepted'
  ) then
    return jsonb_build_object(
      'ok', false,
      'message', 'This application already has an accepted offer.'
    );
  end if;

  if exists (
    select 1
    from public.loan_offers
    where loan_application_id = v_application.id
      and lender_id = v_actor_id
      and status = 'pending'
  ) then
    return jsonb_build_object(
      'ok', false,
      'message', 'You already have a pending offer for this application.'
    );
  end if;

  select coalesce(
    nullif(btrim(lender_profiles.organization_name), ''),
    profiles.display_name,
    'Verified lender'
  )
  into v_lender_name
  from public.profiles
  left join public.lender_profiles
    on lender_profiles.user_id = profiles.id
  where profiles.id = v_actor_id;

  insert into public.loan_offers (
    loan_application_id,
    borrower_id,
    lender_id,
    lender_name,
    approved_amount,
    repayment_amount,
    fees,
    due_date,
    remarks,
    status
  )
  values (
    v_application.id,
    v_application.borrower_id,
    v_actor_id,
    coalesce(v_lender_name, 'Verified lender'),
    round(p_approved_amount, 2),
    round(p_repayment_amount, 2),
    round(p_fees, 2),
    p_due_date,
    nullif(btrim(coalesce(p_remarks, '')), ''),
    'pending'
  )
  returning id into v_offer_id;

  return jsonb_build_object(
    'ok', true,
    'message', 'Offer sent.',
    'offer_id', v_offer_id,
    'loan_application_id', v_application.id
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'ok', false,
      'message', 'You already have a pending offer for this application.'
    );
  when check_violation then
    return jsonb_build_object(
      'ok', false,
      'message', 'Review the offer details before sending.'
    );
end;
$$;
