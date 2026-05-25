create or replace function app_private.calculate_borrower_credit_limit(
  p_monthly_gross_revenue numeric,
  p_monthly_expenses numeric,
  p_existing_loan_payments numeric,
  p_years_in_operation numeric
)
returns numeric
language sql
immutable
set search_path = public, pg_temp
as $$
  select greatest(
    0,
    floor(
      least(
        (
          (
            coalesce(p_monthly_gross_revenue, 0)
            - coalesce(p_monthly_expenses, 0)
            - coalesce(p_existing_loan_payments, 0)
          )
          * 3
          * case
              when coalesce(p_years_in_operation, 0) < 1 then 0.75
              when coalesce(p_years_in_operation, 0) < 3 then 1.0
              else 1.25
            end
        ),
        coalesce(p_monthly_gross_revenue, 0) * 2,
        1000000
      ) / 100
    ) * 100
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
  select coalesce(sum(outstanding_balance), 0)
  from public.active_loans
  where borrower_id = p_borrower_id
    and outstanding_balance > 0;
$$;

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

  return new;
end;
$$;

drop trigger if exists loan_applications_credit_limit_trigger
  on public.loan_applications;
create trigger loan_applications_credit_limit_trigger
  before insert or update of requested_amount, borrower_id, borrower_portfolio_id
  on public.loan_applications
  for each row execute function app_private.enforce_loan_application_credit_limit();

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
    status
  )
  values (
    v_actor_id,
    v_portfolio.id,
    round(p_requested_amount, 2),
    btrim(p_purpose),
    p_preferred_term,
    nullif(btrim(coalesce(p_remarks, '')), ''),
    'submitted'
  )
  returning id, borrower_id, borrower_portfolio_id, requested_amount, purpose,
    preferred_term, remarks, status, submitted_at, created_at, updated_at
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

grant execute on function app_private.calculate_borrower_credit_limit(
  numeric,
  numeric,
  numeric,
  numeric
) to authenticated;
grant execute on function app_private.calculate_borrower_used_credit(uuid)
  to authenticated;
grant execute on function app_private.submit_loan_application(
  numeric,
  text,
  public.preferred_term,
  text
) to authenticated;
grant execute on function public.submit_loan_application(
  numeric,
  text,
  public.preferred_term,
  text
) to authenticated;
