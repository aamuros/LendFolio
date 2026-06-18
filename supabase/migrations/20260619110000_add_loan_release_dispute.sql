alter type public.disbursement_status add value if not exists 'release_disputed';

alter table public.active_loans
  add column if not exists release_disputed_at timestamptz,
  add column if not exists release_dispute_reason text,
  add column if not exists release_disputed_by uuid references public.profiles(id);

drop policy if exists "storage_repayment_proofs_borrower_release_select"
  on storage.objects;

create policy "storage_repayment_proofs_borrower_release_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'repayment-proofs'
    and app_private.is_borrower((select auth.uid()))
    and exists (
      select 1
      from public.active_loans
      where active_loans.release_proof_url = storage.objects.name
        and active_loans.borrower_id = (select auth.uid())
    )
  );

create or replace function app_private.report_loan_release_not_received(
  p_active_loan_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_loan record;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_borrower(v_actor_id) then
    return jsonb_build_object('ok', false, 'message', 'Only borrowers can report a release issue.');
  end if;

  if v_reason is null then
    return jsonb_build_object('ok', false, 'message', 'Enter a reason for the report.');
  end if;

  select id, borrower_id, lender_id, loan_application_id, disbursement_status, status, borrower_received_at
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

  if v_loan.disbursement_status = 'release_disputed' then
    return jsonb_build_object('ok', false, 'message', 'This release was already reported.');
  end if;

  if v_loan.disbursement_status = 'received_by_borrower' or v_loan.borrower_received_at is not null then
    return jsonb_build_object('ok', false, 'message', 'Money receipt was already confirmed.');
  end if;

  if v_loan.disbursement_status <> 'released_by_lender' then
    return jsonb_build_object('ok', false, 'message', 'Wait for the lender to mark the funds released.');
  end if;

  update public.active_loans
  set
    disbursement_status = 'release_disputed',
    release_disputed_at = now(),
    release_dispute_reason = v_reason,
    release_disputed_by = v_actor_id,
    updated_at = now()
  where id = p_active_loan_id;

  perform app_private.write_audit_log(
    'loan_release_disputed',
    'active_loans',
    p_active_loan_id,
    jsonb_build_object(
      'loan_application_id', v_loan.loan_application_id,
      'borrower_id', v_loan.borrower_id,
      'lender_id', v_loan.lender_id
    )
  );

  perform app_private.try_create_notification(
    v_loan.lender_id,
    'loan_release_disputed',
    'Borrower reported funds not received',
    'The borrower reported that the marked release has not arrived.',
    '/lender/loans/' || p_active_loan_id::text
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Report submitted.',
    'active_loan_id', p_active_loan_id
  );
end;
$$;

create or replace function public.report_loan_release_not_received(
  p_active_loan_id uuid,
  p_reason text
)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select app_private.report_loan_release_not_received(p_active_loan_id, p_reason);
$$;

grant execute on function app_private.report_loan_release_not_received(uuid, text) to authenticated;
grant execute on function public.report_loan_release_not_received(uuid, text) to authenticated;

create or replace function app_private.confirm_loan_funds_received(
  p_active_loan_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_loan record;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_borrower(v_actor_id) then
    return jsonb_build_object('ok', false, 'message', 'Only borrowers can confirm receipt.');
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

  if v_loan.disbursement_status = 'awaiting_release' then
    return jsonb_build_object('ok', false, 'message', 'Wait for the lender to mark the funds released.');
  end if;

  if v_loan.disbursement_status = 'release_disputed' then
    return jsonb_build_object('ok', false, 'message', 'This release is under review.');
  end if;

  if v_loan.disbursement_status = 'received_by_borrower' then
    return jsonb_build_object(
      'ok', true,
      'message', 'Money received. Your loan is now active.',
      'active_loan_id', p_active_loan_id
    );
  end if;

  update public.active_loans
  set
    disbursement_status = 'received_by_borrower',
    borrower_received_at = coalesce(borrower_received_at, now()),
    status = case when status = 'active' then 'active'::public.active_loan_status else status end,
    updated_at = now()
  where id = p_active_loan_id;

  perform app_private.write_audit_log(
    'loan_funds_received',
    'active_loans',
    p_active_loan_id,
    jsonb_build_object(
      'loan_application_id', v_loan.loan_application_id,
      'borrower_id', v_loan.borrower_id,
      'lender_id', v_loan.lender_id
    )
  );

  perform app_private.try_create_notification(
    v_loan.lender_id,
    'loan_funds_received',
    'Borrower confirmed receipt',
    'The borrower confirmed that the loan funds were received.',
    '/lender/loans/' || p_active_loan_id::text
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Money received. Your loan is now active.',
    'active_loan_id', p_active_loan_id
  );
end;
$$;

grant execute on function app_private.confirm_loan_funds_received(uuid) to authenticated;

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

  select id, borrower_id, lender_id, loan_application_id, disbursement_status, status
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

  if v_loan.disbursement_status = 'release_disputed' then
    return jsonb_build_object('ok', false, 'message', 'This release is under review.');
  end if;

  if v_loan.disbursement_status = 'received_by_borrower' then
    return jsonb_build_object('ok', false, 'message', 'The borrower already confirmed receipt.');
  end if;

  update public.active_loans
  set
    disbursement_status = 'released_by_lender',
    disbursed_at = coalesce(disbursed_at, now()),
    disbursement_method = nullif(trim(p_disbursement_method), ''),
    disbursement_reference = nullif(trim(p_disbursement_reference), ''),
    disbursement_notes = nullif(trim(p_disbursement_notes), ''),
    release_proof_url = nullif(trim(p_release_proof_path), ''),
    release_proof_file_name = nullif(trim(p_release_proof_file_name), ''),
    release_proof_file_type = nullif(trim(p_release_proof_file_type), ''),
    release_proof_file_size = p_release_proof_file_size,
    updated_at = now()
  where id = p_active_loan_id;

  perform app_private.write_audit_log(
    'loan_funds_released',
    'active_loans',
    p_active_loan_id,
    jsonb_build_object(
      'loan_application_id', v_loan.loan_application_id,
      'borrower_id', v_loan.borrower_id,
      'lender_id', v_loan.lender_id,
      'has_release_proof', p_release_proof_path is not null
    )
  );

  perform app_private.try_create_notification(
    v_loan.borrower_id,
    'loan_funds_released',
    'Funds released',
    'Your lender marked the loan funds as released. Confirm when you receive the money.',
    '/borrower?tab=loans&loanId=' || p_active_loan_id::text
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Funds marked as released.',
    'active_loan_id', p_active_loan_id
  );
end;
$$;

grant execute on function app_private.mark_loan_funds_released(uuid, text, text, text, text, text, text, integer) to authenticated;
