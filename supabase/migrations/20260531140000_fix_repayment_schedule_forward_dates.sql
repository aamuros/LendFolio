-- Fix repayment schedule to calculate dates forward from acceptance date.
-- Previously, dates were calculated backward from the offer's due_date, which
-- could produce installment dates in the past when the offer due date was close
-- to the acceptance date relative to the term length.

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
  v_loan_due_date date;
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
    loan_offers.status,
    loan_applications.preferred_term
  into v_offer
  from public.loan_offers
  join public.loan_applications
    on loan_applications.id = loan_offers.loan_application_id
  where loan_offers.id = p_offer_id
    and loan_offers.borrower_id = v_actor_id
    and loan_offers.status = 'pending'
    and loan_applications.status in ('submitted', 'open')
  for update of loan_offers;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'This offer is no longer available.'
    );
  end if;

  select
    id,
    borrower_id,
    monthly_gross_revenue,
    monthly_expenses,
    existing_loan_payments,
    years_in_operation
  into v_portfolio
  from public.borrower_portfolios
  where borrower_id = v_actor_id
  order by updated_at desc
  limit 1;

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

  v_loan_due_date := (current_date::date + (v_installment_count || ' months')::interval)::date;

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
    v_loan_due_date
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
      (current_date::date + (v_installment_number || ' months')::interval)::date;

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
