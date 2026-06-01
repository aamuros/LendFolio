-- Enforce that the approved principal cannot exceed the borrower's requested amount.

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
      'message', 'Approved amount cannot exceed the borrower''s requested amount.'
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
