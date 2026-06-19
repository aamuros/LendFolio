alter table public.active_loans
  add column if not exists disbursement_destination_method text,
  add column if not exists disbursement_destination_account_name text,
  add column if not exists disbursement_destination_account_number text,
  add column if not exists disbursement_destination_notes text,
  add column if not exists disbursement_destination_submitted_at timestamptz;

drop policy if exists "storage_repayment_proofs_lender_release_insert"
  on storage.objects;

create policy "storage_repayment_proofs_lender_release_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'repayment-proofs'
    and split_part(name, '/', 1) = 'lenders'
    and split_part(name, '/', 2) = (select auth.uid())::text
    and split_part(name, '/', 3) = 'loans'
    and split_part(name, '/', 4) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and split_part(name, '/', 5) = 'release'
    and char_length(split_part(name, '/', 6)) > 0
    and app_private.is_approved_lender((select auth.uid()))
    and exists (
      select 1
      from public.active_loans
      where active_loans.id = split_part(storage.objects.name, '/', 4)::uuid
        and active_loans.lender_id = (select auth.uid())
        and active_loans.disbursement_status in ('awaiting_release', 'release_disputed')
        and active_loans.disbursement_destination_submitted_at is not null
        and active_loans.status not in ('paid', 'closed', 'defaulted')
    )
  );

create or replace function app_private.submit_loan_disbursement_destination(
  p_active_loan_id uuid,
  p_method text,
  p_account_name text default null,
  p_account_number text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_loan record;
  v_method text := nullif(trim(coalesce(p_method, '')), '');
  v_account_name text := nullif(trim(coalesce(p_account_name, '')), '');
  v_account_number text := nullif(trim(coalesce(p_account_number, '')), '');
  v_notes text := nullif(trim(coalesce(p_notes, '')), '');
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_borrower(v_actor_id) then
    return jsonb_build_object('ok', false, 'message', 'Only borrowers can submit payout details.');
  end if;

  if v_method is null or v_method not in ('GCash', 'Maya', 'Bank transfer', 'Cash pickup', 'Other') then
    return jsonb_build_object('ok', false, 'message', 'Choose where the funds should be sent.');
  end if;

  if v_method <> 'Cash pickup' and v_account_name is null then
    return jsonb_build_object('ok', false, 'message', 'Enter the account name.');
  end if;

  if v_method <> 'Cash pickup' and v_account_number is null then
    return jsonb_build_object('ok', false, 'message', 'Enter the account number or mobile number.');
  end if;

  select id, borrower_id, lender_id, loan_application_id, disbursement_status, status
  into v_loan
  from public.active_loans
  where id = p_active_loan_id
  for update;

  if not found or v_loan.borrower_id <> v_actor_id then
    return jsonb_build_object('ok', false, 'message', 'Could not update this loan.');
  end if;

  if v_loan.status in ('paid', 'closed', 'defaulted') then
    return jsonb_build_object('ok', false, 'message', 'This loan is already closed.');
  end if;

  if v_loan.disbursement_status <> 'awaiting_release' then
    return jsonb_build_object('ok', false, 'message', 'Payout details can only be submitted before fund release.');
  end if;

  update public.active_loans
  set
    disbursement_destination_method = v_method,
    disbursement_destination_account_name = v_account_name,
    disbursement_destination_account_number = v_account_number,
    disbursement_destination_notes = v_notes,
    disbursement_destination_submitted_at = now(),
    updated_at = now()
  where id = p_active_loan_id;

  perform app_private.write_audit_log(
    'loan_disbursement_destination_submitted',
    'active_loans',
    p_active_loan_id,
    jsonb_build_object(
      'loan_application_id', v_loan.loan_application_id,
      'borrower_id', v_loan.borrower_id,
      'lender_id', v_loan.lender_id,
      'method', v_method
    )
  );

  perform app_private.try_create_notification(
    v_loan.lender_id,
    'loan_disbursement_destination_submitted',
    'Borrower added payout details',
    'The borrower added where the loan funds should be sent.',
    '/lender/loans/' || p_active_loan_id::text
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Payout details saved.',
    'active_loan_id', p_active_loan_id
  );
end;
$$;

create or replace function public.submit_loan_disbursement_destination(
  p_active_loan_id uuid,
  p_method text,
  p_account_name text default null,
  p_account_number text default null,
  p_notes text default null
)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select app_private.submit_loan_disbursement_destination(
    p_active_loan_id,
    p_method,
    p_account_name,
    p_account_number,
    p_notes
  );
$$;

grant execute on function app_private.submit_loan_disbursement_destination(uuid, text, text, text, text) to authenticated;
grant execute on function public.submit_loan_disbursement_destination(uuid, text, text, text, text) to authenticated;

create or replace function app_private.mark_loan_funds_released(
  p_active_loan_id uuid,
  p_disbursement_method text default null,
  p_disbursement_reference text default null,
  p_disbursement_notes text default null,
  p_release_proof_path text default null,
  p_release_proof_file_name text default null,
  p_release_proof_file_type text default null,
  p_release_proof_file_size integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_loan record;
  v_is_retry boolean := false;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_approved_lender(v_actor_id) then
    return jsonb_build_object('ok', false, 'message', 'Only approved lenders can release funds.');
  end if;

  if nullif(trim(coalesce(p_disbursement_method, '')), '') is null then
    return jsonb_build_object('ok', false, 'message', 'Choose a release method.');
  end if;

  if p_release_proof_path is not null then
    if nullif(trim(p_release_proof_path), '') is null then
      return jsonb_build_object('ok', false, 'message', 'Could not confirm the release proof path.');
    end if;

    if p_release_proof_file_type not in ('image/png', 'image/jpeg', 'image/webp', 'application/pdf') then
      return jsonb_build_object('ok', false, 'message', 'Upload a PNG, JPG, WEBP, or PDF file.');
    end if;

    if coalesce(p_release_proof_file_size, 0) <= 0 or p_release_proof_file_size > 5242880 then
      return jsonb_build_object('ok', false, 'message', 'Release proof must be 5MB or smaller.');
    end if;
  end if;

  select
    id,
    borrower_id,
    lender_id,
    loan_application_id,
    disbursement_status,
    status,
    disbursement_destination_submitted_at
  into v_loan
  from public.active_loans
  where id = p_active_loan_id
  for update;

  if not found or v_loan.lender_id <> v_actor_id then
    return jsonb_build_object('ok', false, 'message', 'Could not update this loan.');
  end if;

  if v_loan.status in ('paid', 'closed', 'defaulted') then
    return jsonb_build_object('ok', false, 'message', 'This loan is already closed.');
  end if;

  if v_loan.disbursement_destination_submitted_at is null then
    return jsonb_build_object('ok', false, 'message', 'Wait for borrower payout details before releasing funds.');
  end if;

  if v_loan.disbursement_status not in ('awaiting_release', 'release_disputed') then
    if v_loan.disbursement_status = 'received_by_borrower' then
      return jsonb_build_object('ok', false, 'message', 'The borrower already confirmed receipt.');
    end if;

    return jsonb_build_object('ok', false, 'message', 'This loan is not waiting for fund release.');
  end if;

  v_is_retry := v_loan.disbursement_status = 'release_disputed';

  update public.active_loans
  set
    disbursement_status = 'released_by_lender',
    disbursed_at = now(),
    disbursement_method = nullif(trim(p_disbursement_method), ''),
    disbursement_reference = nullif(trim(p_disbursement_reference), ''),
    disbursement_notes = nullif(trim(p_disbursement_notes), ''),
    release_proof_url = nullif(trim(p_release_proof_path), ''),
    release_proof_file_name = nullif(trim(p_release_proof_file_name), ''),
    release_proof_file_type = nullif(trim(p_release_proof_file_type), ''),
    release_proof_file_size = p_release_proof_file_size,
    release_disputed_at = null,
    release_dispute_reason = null,
    release_disputed_by = null,
    updated_at = now()
  where id = p_active_loan_id;

  perform app_private.write_audit_log(
    case when v_is_retry then 'loan_funds_released_retry' else 'loan_funds_released' end,
    'active_loans',
    p_active_loan_id,
    jsonb_build_object(
      'loan_application_id', v_loan.loan_application_id,
      'borrower_id', v_loan.borrower_id,
      'lender_id', v_loan.lender_id,
      'has_release_proof', p_release_proof_path is not null,
      'is_retry', v_is_retry
    )
  );

  perform app_private.try_create_notification(
    v_loan.borrower_id,
    case when v_is_retry then 'loan_funds_released_retry' else 'loan_funds_released' end,
    case when v_is_retry then 'Release proof updated' else 'Funds released' end,
    case
      when v_is_retry then 'Your lender submitted corrected release details. Confirm when you receive the money.'
      else 'Your lender marked the loan funds as released. Confirm when you receive the money.'
    end,
    '/borrower?tab=loans&loanId=' || p_active_loan_id::text
  );

  return jsonb_build_object(
    'ok', true,
    'message', case when v_is_retry then 'Corrected release proof submitted.' else 'Funds marked as released.' end,
    'active_loan_id', p_active_loan_id
  );
end;
$$;

grant execute on function app_private.mark_loan_funds_released(uuid, text, text, text, text, text, text, integer) to authenticated;
