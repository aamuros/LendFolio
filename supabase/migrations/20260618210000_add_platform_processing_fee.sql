-- Persist system processing fees separately from principal, lender charges, and other fees.
-- Historical rows are left at zero because older repayment_amount values do not
-- reliably indicate whether a platform fee was included.

alter table public.loan_offers
  add column if not exists processing_fee_rate numeric not null default 0.02,
  add column if not exists processing_fee_amount numeric not null default 0;

alter table public.active_loans
  add column if not exists processing_fee_rate numeric not null default 0.02,
  add column if not exists processing_fee_amount numeric not null default 0;

update public.loan_offers
set processing_fee_rate = 0.02,
    processing_fee_amount = 0
where processing_fee_amount is null;

update public.active_loans
set processing_fee_rate = 0.02,
    processing_fee_amount = 0
where processing_fee_amount is null;

create or replace function public.create_loan_offer(
  p_loan_application_id uuid,
  p_approved_amount numeric,
  p_repayment_amount numeric,
  p_interest_service_charge_rate numeric,
  p_fees numeric,
  p_processing_fee_rate numeric,
  p_processing_fee_amount numeric,
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
  v_interest_amount numeric(12, 2);
  v_processing_fee_rate numeric(8, 4) := 0.02;
  v_processing_fee_amount numeric(12, 2);
  v_total_repayment_amount numeric(12, 2);
  v_available_credit numeric(12, 2);
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_approved_lender(v_actor_id) then
    return jsonb_build_object('ok', false, 'message', 'Only approved lenders can send offers.');
  end if;

  if p_loan_application_id is null then
    return jsonb_build_object('ok', false, 'message', 'Choose an application before sending an offer.');
  end if;

  if p_approved_amount is null or p_approved_amount <= 0 or p_approved_amount > 1000000 then
    return jsonb_build_object('ok', false, 'message', 'Approved principal must be greater than PHP 0 and PHP 1,000,000 or less.');
  end if;

  if p_interest_service_charge_rate is null or p_interest_service_charge_rate < 0 or p_interest_service_charge_rate > 100 then
    return jsonb_build_object('ok', false, 'message', 'Interest or service charge rate must be between 0% and 100%.');
  end if;

  if p_fees is null or p_fees < 0 or p_fees > 500000 then
    return jsonb_build_object('ok', false, 'message', 'Fees must be between PHP 0 and PHP 500,000.');
  end if;

  if p_processing_fee_amount is not null and p_processing_fee_amount < 0 then
    return jsonb_build_object('ok', false, 'message', 'System processing fee cannot be negative.');
  end if;

  if p_processing_fee_rate is not null and round(p_processing_fee_rate, 4) <> v_processing_fee_rate then
    return jsonb_build_object('ok', false, 'message', 'System processing fee rate is not valid.');
  end if;

  if p_due_date is null or p_due_date <= current_date then
    return jsonb_build_object('ok', false, 'message', 'Choose a future due date.');
  end if;

  if p_remarks is not null and char_length(p_remarks) > 500 then
    return jsonb_build_object('ok', false, 'message', 'Keep remarks under 500 characters.');
  end if;

  if p_repayment_channel is null or char_length(btrim(p_repayment_channel)) = 0 then
    return jsonb_build_object('ok', false, 'message', 'Enter a repayment channel.');
  end if;

  if p_repayment_account_name is null or char_length(btrim(p_repayment_account_name)) = 0 then
    return jsonb_build_object('ok', false, 'message', 'Enter the account name for repayment.');
  end if;

  if p_repayment_account_number is null or char_length(btrim(p_repayment_account_number)) = 0 then
    return jsonb_build_object('ok', false, 'message', 'Enter the account number for repayment.');
  end if;

  if char_length(p_repayment_channel) > 100 then
    return jsonb_build_object('ok', false, 'message', 'Keep repayment channel under 100 characters.');
  end if;

  if char_length(p_repayment_account_name) > 200 then
    return jsonb_build_object('ok', false, 'message', 'Keep account name under 200 characters.');
  end if;

  if char_length(p_repayment_account_number) > 100 then
    return jsonb_build_object('ok', false, 'message', 'Keep account number under 100 characters.');
  end if;

  if p_repayment_instructions is not null and char_length(p_repayment_instructions) > 500 then
    return jsonb_build_object('ok', false, 'message', 'Keep repayment instructions under 500 characters.');
  end if;

  v_interest_amount := round(round(p_approved_amount, 2) * (p_interest_service_charge_rate / 100), 2);
  v_processing_fee_amount := round(round(p_approved_amount, 2) * v_processing_fee_rate, 2);
  v_total_repayment_amount :=
    round(p_approved_amount, 2) + v_interest_amount + round(p_fees, 2) + v_processing_fee_amount;

  if p_processing_fee_amount is not null and round(p_processing_fee_amount, 2) <> v_processing_fee_amount then
    return jsonb_build_object('ok', false, 'message', 'System processing fee does not match the approved principal.');
  end if;

  if p_repayment_amount is null or round(p_repayment_amount, 2) <> v_total_repayment_amount then
    return jsonb_build_object('ok', false, 'message', 'Total repayment must include principal, interest, fees, and system processing fee.');
  end if;

  if v_total_repayment_amount > 1500000 then
    return jsonb_build_object('ok', false, 'message', 'Total repayment must be PHP 1,500,000 or less.');
  end if;

  select
    loan_applications.id,
    loan_applications.borrower_id,
    loan_applications.requested_amount,
    loan_applications.available_credit_at_submission,
    loan_applications.status
  into v_application
  from public.loan_applications
  where loan_applications.id = p_loan_application_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'This application is not available for offers.');
  end if;

  if p_approved_amount > v_application.requested_amount then
    return jsonb_build_object('ok', false, 'message', 'Approved amount cannot exceed the borrower''s requested amount.');
  end if;

  v_available_credit := coalesce(v_application.available_credit_at_submission, v_application.requested_amount);

  if p_approved_amount > v_available_credit then
    return jsonb_build_object(
      'ok', false,
      'message', 'Approved principal cannot exceed the borrower''s available credit of PHP ' ||
        to_char(v_available_credit, 'FM999,999,999') || '.'
    );
  end if;

  if v_application.status not in ('submitted', 'open') then
    return jsonb_build_object('ok', false, 'message', 'This application is not open for offers.');
  end if;

  if exists (
    select 1 from public.loan_offers
    where loan_application_id = v_application.id and status = 'accepted'
  ) then
    return jsonb_build_object('ok', false, 'message', 'This application already has an accepted offer.');
  end if;

  if exists (
    select 1 from public.loan_offers
    where loan_application_id = v_application.id
      and lender_id = v_actor_id
      and status = 'pending'
  ) then
    return jsonb_build_object('ok', false, 'message', 'You already have a pending offer for this application.');
  end if;

  select coalesce(nullif(btrim(lender_profiles.organization_name), ''), profiles.display_name, 'Verified lender')
  into v_lender_name
  from public.profiles
  left join public.lender_profiles on lender_profiles.user_id = profiles.id
  where profiles.id = v_actor_id;

  insert into public.loan_offers (
    loan_application_id,
    borrower_id,
    lender_id,
    lender_name,
    approved_amount,
    interest_service_charge_rate,
    repayment_amount,
    fees,
    processing_fee_rate,
    processing_fee_amount,
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
    round(p_interest_service_charge_rate, 3),
    v_total_repayment_amount,
    round(p_fees, 2),
    v_processing_fee_rate,
    v_processing_fee_amount,
    p_due_date,
    nullif(btrim(coalesce(p_remarks, '')), ''),
    'pending',
    btrim(p_repayment_channel),
    btrim(p_repayment_account_name),
    btrim(p_repayment_account_number),
    nullif(btrim(coalesce(p_repayment_instructions, '')), '')
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
    'interest_amount', v_interest_amount,
    'interest_service_charge_rate', round(p_interest_service_charge_rate, 3),
    'processing_fee_rate', v_processing_fee_rate,
    'processing_fee_amount', v_processing_fee_amount,
    'available_credit_at_submission', v_available_credit,
    'total_repayment_amount', v_total_repayment_amount,
    'remaining_credit_after_principal', round(v_available_credit - p_approved_amount, 2)
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'message', 'You already have a pending offer for this application.');
  when check_violation then
    return jsonb_build_object('ok', false, 'message', 'Review the offer details before sending.');
end;
$$;

create or replace function app_private.copy_offer_processing_fee_to_active_loan()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  select
    loan_offers.processing_fee_rate,
    loan_offers.processing_fee_amount
  into
    new.processing_fee_rate,
    new.processing_fee_amount
  from public.loan_offers
  where loan_offers.id = new.accepted_offer_id;

  new.processing_fee_rate := coalesce(new.processing_fee_rate, 0.02);
  new.processing_fee_amount := coalesce(new.processing_fee_amount, 0);

  return new;
end;
$$;

drop trigger if exists copy_offer_processing_fee_to_active_loan on public.active_loans;
create trigger copy_offer_processing_fee_to_active_loan
before insert on public.active_loans
for each row
execute function app_private.copy_offer_processing_fee_to_active_loan();

grant execute on function public.create_loan_offer(
  uuid, numeric, numeric, numeric, numeric, numeric, numeric, date, text, text, text, text, text
) to authenticated;
