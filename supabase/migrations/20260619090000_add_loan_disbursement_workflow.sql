-- Track fund release separately from offer acceptance and repayment status.

create type public.disbursement_status as enum (
  'awaiting_release',
  'released_by_lender',
  'received_by_borrower'
);

alter table public.active_loans
  add column if not exists disbursement_status public.disbursement_status not null default 'awaiting_release',
  add column if not exists disbursed_at timestamptz,
  add column if not exists disbursement_method text,
  add column if not exists disbursement_reference text,
  add column if not exists disbursement_notes text,
  add column if not exists borrower_received_at timestamptz;

update public.active_loans
set
  disbursement_status = 'received_by_borrower',
  disbursed_at = coalesce(disbursed_at, started_at),
  borrower_received_at = coalesce(borrower_received_at, started_at)
where disbursement_status = 'awaiting_release'
  and exists (
    select 1
    from public.loan_repayment_schedules
    where loan_repayment_schedules.active_loan_id = active_loans.id
      and loan_repayment_schedules.status in ('submitted', 'verified', 'rejected', 'late')
  );

create or replace function app_private.mark_loan_funds_released(
  p_active_loan_id uuid,
  p_disbursement_method text default null,
  p_disbursement_reference text default null,
  p_disbursement_notes text default null
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
    updated_at = now()
  where id = p_active_loan_id;

  perform app_private.write_audit_log(
    'loan_funds_released',
    'active_loans',
    p_active_loan_id,
    jsonb_build_object(
      'loan_application_id', v_loan.loan_application_id,
      'borrower_id', v_loan.borrower_id,
      'lender_id', v_loan.lender_id
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

  if v_loan.disbursement_status = 'awaiting_release' then
    return jsonb_build_object('ok', false, 'message', 'Wait for the lender to mark the funds released.');
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

create or replace function app_private.submit_repayment_proof(
  p_repayment_schedule_id uuid,
  p_storage_path text,
  p_file_name text,
  p_file_type text,
  p_file_size integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_schedule record;
  v_proof_id uuid;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_borrower(v_actor_id) then
    return jsonb_build_object('ok', false, 'message', 'Only borrowers can upload repayment proof.');
  end if;

  if p_file_size <= 0 or p_file_size > 5242880 then
    return jsonb_build_object('ok', false, 'message', 'Upload a file up to 5 MB.');
  end if;

  if p_file_type not in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf') then
    return jsonb_build_object('ok', false, 'message', 'Upload a JPG, PNG, WebP, HEIC, or PDF file.');
  end if;

  select
    loan_repayment_schedules.id as repayment_schedule_id,
    loan_repayment_schedules.active_loan_id,
    loan_repayment_schedules.borrower_id,
    loan_repayment_schedules.lender_id,
    loan_repayment_schedules.status as repayment_status,
    loan_repayment_schedules.due_date,
    active_loans.status as active_loan_status,
    active_loans.disbursement_status
  into v_schedule
  from public.loan_repayment_schedules
  join public.active_loans
    on active_loans.id = loan_repayment_schedules.active_loan_id
  where loan_repayment_schedules.id = p_repayment_schedule_id
  for update of loan_repayment_schedules, active_loans;

  if not found or v_schedule.borrower_id <> v_actor_id then
    return jsonb_build_object('ok', false, 'message', 'Could not upload proof for this repayment.');
  end if;

  if v_schedule.disbursement_status <> 'received_by_borrower' then
    return jsonb_build_object('ok', false, 'message', 'Confirm money received before uploading repayment proof.');
  end if;

  if v_schedule.repayment_status = 'verified' then
    return jsonb_build_object('ok', false, 'message', 'This repayment is already verified.');
  end if;

  if v_schedule.active_loan_status not in ('active', 'overdue') then
    return jsonb_build_object('ok', false, 'message', 'This loan is not active.');
  end if;

  if v_schedule.repayment_status = 'submitted' then
    return jsonb_build_object('ok', false, 'message', 'A proof is already waiting for lender review.');
  end if;

  if v_schedule.repayment_status not in ('due', 'late', 'rejected') then
    return jsonb_build_object('ok', false, 'message', 'This repayment is not ready for proof upload.');
  end if;

  if exists (
    select 1
    from public.repayment_proofs
    where repayment_schedule_id = p_repayment_schedule_id
      and status = 'submitted'
  ) then
    return jsonb_build_object('ok', false, 'message', 'A proof is already waiting for lender review.');
  end if;

  if exists (
    select 1
    from public.repayment_proofs
    where repayment_schedule_id = p_repayment_schedule_id
      and status = 'verified'
  ) then
    return jsonb_build_object('ok', false, 'message', 'This repayment is already verified.');
  end if;

  if p_storage_path <> concat(
    'borrowers/',
    v_actor_id::text,
    '/loans/',
    v_schedule.active_loan_id::text,
    '/repayments/',
    p_repayment_schedule_id::text,
    '/',
    split_part(p_storage_path, '/', 7)
  ) then
    return jsonb_build_object('ok', false, 'message', 'Could not confirm the proof upload path.');
  end if;

  insert into public.repayment_proofs (
    repayment_schedule_id,
    active_loan_id,
    borrower_id,
    lender_id,
    storage_path,
    file_name,
    file_type,
    file_size,
    status
  )
  values (
    p_repayment_schedule_id,
    v_schedule.active_loan_id,
    v_schedule.borrower_id,
    v_schedule.lender_id,
    p_storage_path,
    p_file_name,
    p_file_type,
    p_file_size,
    'submitted'
  )
  returning id into v_proof_id;

  update public.loan_repayment_schedules
  set
    status = 'submitted',
    was_late = was_late
      or v_schedule.repayment_status = 'late'
      or current_date > v_schedule.due_date,
    updated_at = now()
  where id = p_repayment_schedule_id;

  perform app_private.write_audit_log(
    'repayment_proof_submitted',
    'repayment_proofs',
    v_proof_id,
    jsonb_build_object(
      'repayment_schedule_id', p_repayment_schedule_id,
      'active_loan_id', v_schedule.active_loan_id,
      'proof_id', v_proof_id
    )
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Proof submitted for lender review.',
    'proof_id', v_proof_id,
    'active_loan_id', v_schedule.active_loan_id
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'message', 'A proof is already waiting for lender review.');
end;
$$;

grant execute on function app_private.mark_loan_funds_released(uuid, text, text, text) to authenticated;
grant execute on function app_private.confirm_loan_funds_received(uuid) to authenticated;
grant execute on function app_private.submit_repayment_proof(uuid, text, text, text, integer) to authenticated;

create or replace function public.mark_loan_funds_released(
  p_active_loan_id uuid,
  p_disbursement_method text default null,
  p_disbursement_reference text default null,
  p_disbursement_notes text default null
)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select app_private.mark_loan_funds_released(
    p_active_loan_id,
    p_disbursement_method,
    p_disbursement_reference,
    p_disbursement_notes
  );
$$;

create or replace function public.confirm_loan_funds_received(
  p_active_loan_id uuid
)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select app_private.confirm_loan_funds_received(p_active_loan_id);
$$;

grant execute on function public.mark_loan_funds_released(uuid, text, text, text) to authenticated;
grant execute on function public.confirm_loan_funds_received(uuid) to authenticated;
