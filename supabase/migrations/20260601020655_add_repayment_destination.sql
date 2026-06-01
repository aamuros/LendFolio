-- Add structured repayment destination fields to loan_offers and active_loans.
-- 1. Add columns to loan_offers.
-- 2. Add columns to active_loans (snapshot from accepted offer).
-- 3. Update create_loan_offer RPC to accept and store repayment destination.
-- 4. Update accept_loan_offer RPC to snapshot repayment destination into active_loans.

-- 1. Add repayment destination columns to loan_offers.
alter table public.loan_offers
  add column if not exists repayment_channel text,
  add column if not exists repayment_account_name text,
  add column if not exists repayment_account_number text,
  add column if not exists repayment_instructions text;

alter table public.loan_offers
  alter column repayment_channel set default null,
  alter column repayment_account_name set default null,
  alter column repayment_account_number set default null,
  alter column repayment_instructions set default null;

-- 2. Add repayment destination columns to active_loans.
alter table public.active_loans
  add column if not exists repayment_channel text,
  add column if not exists repayment_account_name text,
  add column if not exists repayment_account_number text,
  add column if not exists repayment_instructions text;

alter table public.active_loans
  alter column repayment_channel set default null,
  alter column repayment_account_name set default null,
  alter column repayment_account_number set default null,
  alter column repayment_instructions set default null;

-- 3. Update create_loan_offer to accept and store repayment destination.
create or replace function app_private.create_loan_offer(
  p_loan_application_id uuid,
  p_approved_amount numeric,
  p_repayment_amount numeric,
  p_fees numeric,
  p_due_date date,
  p_remarks text default null,
  p_repayment_channel text default null,
  p_repayment_account_name text default null,
  p_repayment_account_number text default null,
  p_repayment_instructions text default null
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

  if p_repayment_channel is null or char_length(btrim(p_repayment_channel)) = 0 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Enter a repayment channel.'
    );
  end if;

  if p_repayment_account_name is null or char_length(btrim(p_repayment_account_name)) = 0 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Enter the account name for repayment.'
    );
  end if;

  if p_repayment_account_number is null or char_length(btrim(p_repayment_account_number)) = 0 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Enter the account number for repayment.'
    );
  end if;

  if p_repayment_channel is not null and char_length(p_repayment_channel) > 100 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Keep repayment channel under 100 characters.'
    );
  end if;

  if p_repayment_account_name is not null and char_length(p_repayment_account_name) > 200 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Keep account name under 200 characters.'
    );
  end if;

  if p_repayment_account_number is not null and char_length(p_repayment_account_number) > 100 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Keep account number under 100 characters.'
    );
  end if;

  if p_repayment_instructions is not null and char_length(p_repayment_instructions) > 500 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Keep repayment instructions under 500 characters.'
    );
  end if;

  select
    loan_applications.id,
    loan_applications.borrower_id,
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
    status,
    repayment_channel,
    repayment_account_name,
    repayment_account_number,
    repayment_instructions
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
    'pending',
    btrim(p_repayment_channel),
    btrim(p_repayment_account_name),
    btrim(p_repayment_account_number),
    nullif(btrim(coalesce(p_repayment_instructions, '')), '')
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

create or replace function public.create_loan_offer(
  p_loan_application_id uuid,
  p_approved_amount numeric,
  p_repayment_amount numeric,
  p_fees numeric,
  p_due_date date,
  p_remarks text default null,
  p_repayment_channel text default null,
  p_repayment_account_name text default null,
  p_repayment_account_number text default null,
  p_repayment_instructions text default null
)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.create_loan_offer(
    p_loan_application_id,
    p_approved_amount,
    p_repayment_amount,
    p_fees,
    p_due_date,
    p_remarks,
    p_repayment_channel,
    p_repayment_account_name,
    p_repayment_account_number,
    p_repayment_instructions
  );
$$;

-- 4. Update accept_loan_offer to snapshot repayment destination into active_loans.
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
    loan_offers.repayment_channel,
    loan_offers.repayment_account_name,
    loan_offers.repayment_account_number,
    loan_offers.repayment_instructions,
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
    due_date,
    repayment_channel,
    repayment_account_name,
    repayment_account_number,
    repayment_instructions
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
    v_offer.due_date,
    v_offer.repayment_channel,
    v_offer.repayment_account_name,
    v_offer.repayment_account_number,
    v_offer.repayment_instructions
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

-- Update grants for the new create_loan_offer signature.
grant execute on function app_private.create_loan_offer(
  uuid,
  numeric,
  numeric,
  numeric,
  date,
  text,
  text,
  text,
  text,
  text
) to authenticated;

grant execute on function public.create_loan_offer(
  uuid,
  numeric,
  numeric,
  numeric,
  date,
  text,
  text,
  text,
  text,
  text
) to authenticated;
