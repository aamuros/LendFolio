-- The platform processing fee is withheld from disbursement. It is recorded for
-- audit and revenue reporting, but is not capitalized into borrower repayment.

alter function public.create_loan_offer(
  uuid, numeric, numeric, numeric, numeric, numeric, numeric, date,
  text, text, text, text, text
) rename to create_loan_offer_with_capitalized_processing_fee;

revoke all on function public.create_loan_offer_with_capitalized_processing_fee(
  uuid, numeric, numeric, numeric, numeric, numeric, numeric, date,
  text, text, text, text, text
) from public, anon, authenticated;

create function public.create_loan_offer(
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
  v_processing_fee numeric(12, 2);
  v_result jsonb;
  v_offer_id uuid;
begin
  v_processing_fee := round(round(p_approved_amount, 2) * 0.02, 2);

  -- The prior implementation remains the single workflow implementation. Give
  -- it its legacy total for validation/insertion, then persist the contractual
  -- repayment total without the withheld platform fee in the same transaction.
  v_result := public.create_loan_offer_with_capitalized_processing_fee(
    p_loan_application_id,
    p_approved_amount,
    round(p_repayment_amount, 2) + v_processing_fee,
    p_interest_service_charge_rate,
    p_fees,
    p_processing_fee_rate,
    p_processing_fee_amount,
    p_due_date,
    p_remarks,
    p_repayment_channel,
    p_repayment_account_name,
    p_repayment_account_number,
    p_repayment_instructions
  );

  if not coalesce((v_result ->> 'ok')::boolean, false) then
    return v_result;
  end if;

  v_offer_id := (v_result ->> 'offer_id')::uuid;

  update public.loan_offers
  set repayment_amount = round(p_repayment_amount, 2)
  where id = v_offer_id;

  return v_result || jsonb_build_object(
    'total_repayment_amount', round(p_repayment_amount, 2),
    'net_disbursement_amount', round(p_approved_amount, 2) - v_processing_fee
  );
end;
$$;

grant execute on function public.create_loan_offer(
  uuid, numeric, numeric, numeric, numeric, numeric, numeric, date,
  text, text, text, text, text
) to authenticated;

-- Pending offers have not formed an accepted contract yet, so align them with
-- the new rule. Accepted offers and active loans retain their agreed balances.
update public.loan_offers
set repayment_amount = greatest(
  approved_amount + fees,
  repayment_amount - processing_fee_amount
)
where status = 'pending'
  and processing_fee_amount > 0;

