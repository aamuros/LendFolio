create or replace function app_private.lender_has_accepted_offer_on_application(
  p_application_id uuid,
  p_lender_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.loan_offers
    where loan_application_id = p_application_id
      and lender_id = p_lender_id
      and status = 'accepted'
  );
$$;

create or replace function app_private.portfolio_has_accepted_lender_offer(
  p_portfolio_id uuid,
  p_lender_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.loan_applications
    join public.loan_offers
      on loan_offers.loan_application_id = loan_applications.id
    where loan_applications.borrower_portfolio_id = p_portfolio_id
      and loan_offers.lender_id = p_lender_id
      and loan_offers.status = 'accepted'
  );
$$;

drop policy if exists "loan_applications_select_access"
  on public.loan_applications;
drop policy if exists "borrower_portfolios_select_access"
  on public.borrower_portfolios;

create policy "loan_applications_select_access"
  on public.loan_applications for select
  to authenticated
  using (
    (select auth.uid()) = borrower_id
    or app_private.is_manager((select auth.uid()))
    or (
      app_private.is_approved_lender((select auth.uid()))
      and (
        status in ('submitted', 'open')
        or app_private.lender_has_accepted_offer_on_application(
          id,
          (select auth.uid())
        )
      )
    )
  );

create policy "borrower_portfolios_select_access"
  on public.borrower_portfolios for select
  to authenticated
  using (
    (select auth.uid()) = borrower_id
    or app_private.is_manager((select auth.uid()))
    or (
      app_private.is_approved_lender((select auth.uid()))
      and (
        app_private.portfolio_has_open_application(id)
        or app_private.portfolio_has_accepted_lender_offer(
          id,
          (select auth.uid())
        )
      )
    )
  );

drop policy if exists "loan_offers_insert_approved_lender"
  on public.loan_offers;
revoke insert on public.loan_offers from authenticated;

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

create or replace function public.create_loan_offer(
  p_loan_application_id uuid,
  p_approved_amount numeric,
  p_repayment_amount numeric,
  p_fees numeric,
  p_due_date date,
  p_remarks text default null
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
    p_remarks
  );
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
    loan_applications.preferred_term
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

grant execute on function app_private.lender_has_accepted_offer_on_application(uuid, uuid)
  to authenticated;
grant execute on function app_private.portfolio_has_accepted_lender_offer(uuid, uuid)
  to authenticated;
grant execute on function app_private.create_loan_offer(
  uuid,
  numeric,
  numeric,
  numeric,
  date,
  text
) to authenticated;
grant execute on function public.create_loan_offer(
  uuid,
  numeric,
  numeric,
  numeric,
  date,
  text
) to authenticated;
