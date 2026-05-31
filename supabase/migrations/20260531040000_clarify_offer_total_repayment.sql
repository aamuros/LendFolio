-- Clarify offer repayment semantics.
-- New offers treat repayment_amount as total repayment:
-- approved principal + interest/service charge + fixed fees.

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
  v_lender_min_loan_amount numeric(12, 2);
  v_lender_max_loan_amount numeric(12, 2);
  v_offer_id uuid;
  v_implied_interest_amount numeric(12, 2);
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
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

  if p_fees is null or p_fees < 0 or p_fees > 500000 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Fees must be between PHP 0 and PHP 500,000.'
    );
  end if;

  if p_repayment_amount is null
    or p_repayment_amount < 1000
    or p_repayment_amount > 1500000
  then
    return jsonb_build_object(
      'ok', false,
      'message', 'Total repayment must be between PHP 1,000 and PHP 1,500,000.'
    );
  end if;

  if p_repayment_amount < p_approved_amount + p_fees then
    return jsonb_build_object(
      'ok', false,
      'message', 'Total repayment must include the approved amount and fees.'
    );
  end if;

  v_implied_interest_amount :=
    round(p_repayment_amount, 2) - round(p_approved_amount, 2) - round(p_fees, 2);

  if v_implied_interest_amount < 0 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Interest or service charge cannot be negative.'
    );
  end if;

  if p_due_date is null or p_due_date <= current_date then
    return jsonb_build_object('ok', false, 'message', 'Choose a future due date.');
  end if;

  if p_remarks is not null and char_length(p_remarks) > 500 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Keep remarks under 500 characters.'
    );
  end if;

  select
    lender_profiles.min_loan_amount,
    lender_profiles.max_loan_amount
  into
    v_lender_min_loan_amount,
    v_lender_max_loan_amount
  from public.lender_profiles
  where lender_profiles.user_id = v_actor_id
    and lender_profiles.verification_status = 'approved';

  if v_lender_min_loan_amount is not null
    and p_approved_amount < v_lender_min_loan_amount
  then
    return jsonb_build_object(
      'ok', false,
      'message', 'Approved amount is below your configured minimum loan amount.'
    );
  end if;

  if v_lender_max_loan_amount is not null
    and p_approved_amount > v_lender_max_loan_amount
  then
    return jsonb_build_object(
      'ok', false,
      'message', 'Approved amount exceeds your configured maximum loan amount.'
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

  perform app_private.try_create_notification(
    v_application.borrower_id,
    'offer_received',
    'New loan offer received',
    'A lender sent an offer for your loan application.',
    '/borrower?tab=offers&offerId=' || v_offer_id
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Offer sent.',
    'offer_id', v_offer_id,
    'loan_application_id', v_application.id,
    'interest_amount', v_implied_interest_amount
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

grant execute on function app_private.create_loan_offer(
  uuid, numeric, numeric, numeric, date, text
) to authenticated;
grant execute on function public.create_loan_offer(
  uuid, numeric, numeric, numeric, date, text
) to authenticated;
