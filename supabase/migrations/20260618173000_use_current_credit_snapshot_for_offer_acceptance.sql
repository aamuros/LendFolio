-- Use one fresh borrower credit snapshot for offer acceptance.
-- The accepted offer check must not rely on stale application snapshots or
-- fallback to the first-cycle PHP 10,000 repayment-history cap.

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
  v_credit jsonb;
  v_available_credit numeric;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  select loan_application_id
  into v_application_id
  from public.loan_offers
  where id = p_offer_id;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Could not accept this offer.');
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
    loan_applications.preferred_term
  into v_offer
  from public.loan_applications
  join public.loan_offers
    on loan_offers.loan_application_id = loan_applications.id
  where loan_offers.id = p_offer_id
  for update of loan_applications, loan_offers;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Could not accept this offer.');
  end if;

  if v_offer.borrower_id <> v_actor_id then
    return jsonb_build_object('ok', false, 'message', 'Could not accept this offer.');
  end if;

  perform pg_advisory_xact_lock(hashtext(v_actor_id::text));

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
    return jsonb_build_object('ok', false, 'message', 'This offer is no longer pending.');
  end if;

  if v_offer.application_status not in ('submitted', 'open') then
    return jsonb_build_object('ok', false, 'message', 'This application is no longer open.');
  end if;

  v_credit := app_private.get_borrower_credit_snapshot(
    v_actor_id,
    v_offer.loan_application_id
  );

  if coalesce((v_credit->>'ok')::boolean, false) is false then
    return jsonb_build_object(
      'ok', false,
      'code', coalesce(v_credit->>'code', 'credit_snapshot_unavailable'),
      'message', 'Unable to verify your latest credit limit. Please refresh and try again.'
    );
  end if;

  v_available_credit := greatest(0, (v_credit->>'available_credit')::numeric);

  if v_offer.approved_amount > v_available_credit then
    return jsonb_build_object(
      'ok', false,
      'code', 'credit_limit_exceeded',
      'message', 'Accepting this offer would exceed your credit limit. The approved principal of PHP ' ||
        to_char(v_offer.approved_amount, 'FM999,999,999') || ' exceeds your available credit of PHP ' ||
        to_char(v_available_credit, 'FM999,999,999') || '.'
    );
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
  set status = 'accepted', updated_at = now()
  where id = v_offer.id;

  update public.loan_offers
  set status = 'declined', updated_at = now()
  where loan_application_id = v_offer.loan_application_id
    and id <> v_offer.id
    and status = 'pending';

  get diagnostics v_declined_count = row_count;

  update public.loan_applications
  set status = 'accepted', updated_at = now()
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
    return jsonb_build_object('ok', false, 'message', 'This application already has an active loan.');
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

  perform app_private.try_create_notification(
    v_offer.lender_id,
    'offer_accepted',
    'Offer accepted',
    'A borrower accepted your loan offer. The loan is now active.',
    '/lender/applications/' || v_offer.loan_application_id::text
  );

  perform app_private.try_create_notification(
    loan_offers.lender_id,
    'offer_declined',
    'Offer declined',
    'A borrower accepted another offer for this application.',
    '/lender/applications/' || v_offer.loan_application_id::text
  )
  from public.loan_offers
  where loan_offers.loan_application_id = v_offer.loan_application_id
    and loan_offers.id <> v_offer.id
    and loan_offers.status = 'declined';

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

grant execute on function app_private.get_borrower_credit_snapshot(uuid, uuid) to authenticated;
