drop policy if exists "storage_repayment_proofs_borrower_insert"
  on storage.objects;

create policy "storage_repayment_proofs_borrower_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'repayment-proofs'
    and split_part(name, '/', 1) = 'borrowers'
    and split_part(name, '/', 2) = (select auth.uid())::text
    and split_part(name, '/', 3) = 'loans'
    and split_part(name, '/', 4) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and split_part(name, '/', 5) = 'repayments'
    and split_part(name, '/', 6) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and char_length(split_part(name, '/', 7)) > 0
    and exists (
      select 1
      from public.loan_repayment_schedules
      join public.active_loans
        on active_loans.id = loan_repayment_schedules.active_loan_id
      where active_loans.id = split_part(storage.objects.name, '/', 4)::uuid
        and loan_repayment_schedules.id = split_part(storage.objects.name, '/', 6)::uuid
        and active_loans.borrower_id = (select auth.uid())
        and loan_repayment_schedules.borrower_id = (select auth.uid())
        and active_loans.status in ('active', 'overdue')
        and loan_repayment_schedules.status in ('due', 'late', 'rejected')
        and not exists (
          select 1
          from public.repayment_proofs
          where repayment_proofs.repayment_schedule_id = loan_repayment_schedules.id
            and repayment_proofs.status = 'submitted'
        )
    )
  );

create or replace function app_private.refresh_overdue_repayment_statuses()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_late_repayment_count integer := 0;
  v_overdue_loan_count integer := 0;
  v_restored_loan_count integer := 0;
  v_paid_loan_count integer := 0;
begin
  if v_actor_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Sign in to continue.',
      'late_repayment_count', 0,
      'overdue_loan_count', 0,
      'restored_loan_count', 0,
      'paid_loan_count', 0
    );
  end if;

  if not app_private.is_manager(v_actor_id) then
    return jsonb_build_object(
      'ok', false,
      'message', 'Only managers can refresh overdue statuses.',
      'late_repayment_count', 0,
      'overdue_loan_count', 0,
      'restored_loan_count', 0,
      'paid_loan_count', 0
    );
  end if;

  create temporary table overdue_refresh_late_schedules (
    id uuid primary key,
    active_loan_id uuid not null,
    previous_status public.repayment_status not null
  ) on commit drop;

  create temporary table overdue_refresh_overdue_loans (
    id uuid primary key,
    previous_status public.active_loan_status not null
  ) on commit drop;

  create temporary table overdue_refresh_restored_loans (
    id uuid primary key,
    previous_status public.active_loan_status not null
  ) on commit drop;

  create temporary table overdue_refresh_paid_loans (
    id uuid primary key,
    previous_status public.active_loan_status not null
  ) on commit drop;

  with target as (
    select id, active_loan_id, status as previous_status
    from public.loan_repayment_schedules
    where due_date < current_date
      and status in ('due', 'rejected')
    for update
  ),
  changed as (
    update public.loan_repayment_schedules
    set
      status = 'late',
      updated_at = now()
    from target
    where loan_repayment_schedules.id = target.id
    returning
      loan_repayment_schedules.id,
      loan_repayment_schedules.active_loan_id,
      target.previous_status
  )
  insert into overdue_refresh_late_schedules (id, active_loan_id, previous_status)
  select id, active_loan_id, previous_status
  from changed;

  get diagnostics v_late_repayment_count = row_count;

  insert into public.audit_logs (actor_id, action, target_table, target_id, metadata)
  select
    v_actor_id,
    'repayment_marked_late',
    'loan_repayment_schedules',
    id,
    jsonb_build_object(
      'active_loan_id', active_loan_id,
      'previous_status', previous_status,
      'new_status', 'late'
    )
  from overdue_refresh_late_schedules;

  with target as (
    select id, status as previous_status
    from public.active_loans
    where status = 'active'
      and exists (
        select 1
        from public.loan_repayment_schedules
        where loan_repayment_schedules.active_loan_id = active_loans.id
          and loan_repayment_schedules.status = 'late'
      )
    for update
  ),
  changed as (
    update public.active_loans
    set
      status = 'overdue',
      updated_at = now()
    from target
    where active_loans.id = target.id
    returning active_loans.id, target.previous_status
  )
  insert into overdue_refresh_overdue_loans (id, previous_status)
  select id, previous_status
  from changed;

  get diagnostics v_overdue_loan_count = row_count;

  insert into public.audit_logs (actor_id, action, target_table, target_id, metadata)
  select
    v_actor_id,
    'loan_marked_overdue',
    'active_loans',
    id,
    jsonb_build_object('previous_status', previous_status, 'new_status', 'overdue')
  from overdue_refresh_overdue_loans;

  with target as (
    select id, status as previous_status
    from public.active_loans
    where status <> 'paid'
      and outstanding_balance = 0
      and exists (
        select 1
        from public.loan_repayment_schedules
        where loan_repayment_schedules.active_loan_id = active_loans.id
      )
      and not exists (
        select 1
        from public.loan_repayment_schedules
        where loan_repayment_schedules.active_loan_id = active_loans.id
          and loan_repayment_schedules.status <> 'verified'
      )
    for update
  ),
  changed as (
    update public.active_loans
    set
      status = 'paid',
      updated_at = now()
    from target
    where active_loans.id = target.id
    returning active_loans.id, target.previous_status
  )
  insert into overdue_refresh_paid_loans (id, previous_status)
  select id, previous_status
  from changed;

  get diagnostics v_paid_loan_count = row_count;

  insert into public.audit_logs (actor_id, action, target_table, target_id, metadata)
  select
    v_actor_id,
    'loan_paid',
    'active_loans',
    id,
    jsonb_build_object('previous_status', previous_status, 'new_status', 'paid')
  from overdue_refresh_paid_loans;

  with target as (
    select id, status as previous_status
    from public.active_loans
    where status = 'overdue'
      and outstanding_balance > 0
      and not exists (
        select 1
        from public.loan_repayment_schedules
        where loan_repayment_schedules.active_loan_id = active_loans.id
          and loan_repayment_schedules.status = 'late'
      )
    for update
  ),
  changed as (
    update public.active_loans
    set
      status = 'active',
      updated_at = now()
    from target
    where active_loans.id = target.id
    returning active_loans.id, target.previous_status
  )
  insert into overdue_refresh_restored_loans (id, previous_status)
  select id, previous_status
  from changed;

  get diagnostics v_restored_loan_count = row_count;

  insert into public.audit_logs (actor_id, action, target_table, target_id, metadata)
  select
    v_actor_id,
    'loan_restored_active',
    'active_loans',
    id,
    jsonb_build_object('previous_status', previous_status, 'new_status', 'active')
  from overdue_refresh_restored_loans;

  return jsonb_build_object(
    'ok', true,
    'message', 'Overdue statuses refreshed.',
    'late_repayment_count', v_late_repayment_count,
    'overdue_loan_count', v_overdue_loan_count,
    'restored_loan_count', v_restored_loan_count,
    'paid_loan_count', v_paid_loan_count
  );
end;
$$;

create or replace function public.refresh_overdue_repayment_statuses()
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.refresh_overdue_repayment_statuses();
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
    return jsonb_build_object(
      'ok', false,
      'message', 'Only borrowers can upload repayment proof.'
    );
  end if;

  if p_file_size <= 0 or p_file_size > 5242880 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Upload a file up to 5 MB.'
    );
  end if;

  if p_file_type not in (
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ) then
    return jsonb_build_object(
      'ok', false,
      'message', 'Upload a JPG, PNG, WebP, or PDF file.'
    );
  end if;

  select
    loan_repayment_schedules.id as repayment_schedule_id,
    loan_repayment_schedules.active_loan_id,
    loan_repayment_schedules.borrower_id,
    loan_repayment_schedules.lender_id,
    loan_repayment_schedules.status as repayment_status,
    active_loans.status as active_loan_status
  into v_schedule
  from public.loan_repayment_schedules
  join public.active_loans
    on active_loans.id = loan_repayment_schedules.active_loan_id
  where loan_repayment_schedules.id = p_repayment_schedule_id
  for update of loan_repayment_schedules, active_loans;

  if not found or v_schedule.borrower_id <> v_actor_id then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not upload proof for this repayment.'
    );
  end if;

  if v_schedule.repayment_status = 'verified' then
    return jsonb_build_object(
      'ok', false,
      'message', 'This repayment is already verified.'
    );
  end if;

  if v_schedule.active_loan_status not in ('active', 'overdue') then
    return jsonb_build_object(
      'ok', false,
      'message', 'This loan is not active.'
    );
  end if;

  if v_schedule.repayment_status = 'submitted' then
    return jsonb_build_object(
      'ok', false,
      'message', 'A proof is already waiting for lender review.'
    );
  end if;

  if v_schedule.repayment_status not in ('due', 'late', 'rejected') then
    return jsonb_build_object(
      'ok', false,
      'message', 'This repayment is not ready for proof upload.'
    );
  end if;

  if exists (
    select 1
    from public.repayment_proofs
    where repayment_schedule_id = p_repayment_schedule_id
      and status = 'submitted'
  ) then
    return jsonb_build_object(
      'ok', false,
      'message', 'A proof is already waiting for lender review.'
    );
  end if;

  if exists (
    select 1
    from public.repayment_proofs
    where repayment_schedule_id = p_repayment_schedule_id
      and status = 'verified'
  ) then
    return jsonb_build_object(
      'ok', false,
      'message', 'This repayment is already verified.'
    );
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
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not confirm the proof upload path.'
    );
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
    return jsonb_build_object(
      'ok', false,
      'message', 'A proof is already waiting for lender review.'
    );
end;
$$;

create or replace function app_private.review_repayment_proof(
  p_proof_id uuid,
  p_decision text,
  p_review_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_proof record;
  v_new_balance numeric(12, 2);
  v_new_loan_status public.active_loan_status;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_approved_lender(v_actor_id) then
    return jsonb_build_object(
      'ok', false,
      'message', 'Only approved lenders can review repayment proof.'
    );
  end if;

  if p_decision not in ('verified', 'rejected') then
    return jsonb_build_object(
      'ok', false,
      'message', 'Choose verify or reject.'
    );
  end if;

  select
    repayment_proofs.id as proof_id,
    repayment_proofs.status as proof_status,
    repayment_proofs.repayment_schedule_id,
    repayment_proofs.active_loan_id,
    repayment_proofs.borrower_id,
    repayment_proofs.lender_id,
    loan_repayment_schedules.status as repayment_status,
    loan_repayment_schedules.amount_due,
    active_loans.status as active_loan_status,
    active_loans.outstanding_balance
  into v_proof
  from public.repayment_proofs
  join public.loan_repayment_schedules
    on loan_repayment_schedules.id = repayment_proofs.repayment_schedule_id
  join public.active_loans
    on active_loans.id = repayment_proofs.active_loan_id
  where repayment_proofs.id = p_proof_id
  for update of repayment_proofs, loan_repayment_schedules, active_loans;

  if not found or v_proof.lender_id <> v_actor_id then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not review this proof.'
    );
  end if;

  if v_proof.proof_status <> 'submitted' then
    return jsonb_build_object(
      'ok', false,
      'message', 'This proof has already been reviewed.'
    );
  end if;

  if v_proof.repayment_status <> 'submitted' then
    return jsonb_build_object(
      'ok', false,
      'message', 'This repayment is not waiting for proof review.'
    );
  end if;

  if p_decision = 'rejected' then
    update public.repayment_proofs
    set
      status = 'rejected',
      reviewed_at = now(),
      reviewed_by = v_actor_id,
      review_notes = nullif(btrim(coalesce(p_review_notes, '')), ''),
      updated_at = now()
    where id = p_proof_id;

    update public.loan_repayment_schedules
    set
      status = 'rejected',
      updated_at = now()
    where id = v_proof.repayment_schedule_id;

    perform app_private.write_audit_log(
      'repayment_proof_rejected',
      'repayment_proofs',
      p_proof_id,
      jsonb_build_object(
        'repayment_schedule_id', v_proof.repayment_schedule_id,
        'active_loan_id', v_proof.active_loan_id,
        'proof_id', p_proof_id
      )
    );

    return jsonb_build_object(
      'ok', true,
      'message', 'Proof rejected.',
      'proof_id', p_proof_id,
      'active_loan_id', v_proof.active_loan_id
    );
  end if;

  v_new_balance := greatest(
    v_proof.outstanding_balance - v_proof.amount_due,
    0
  );

  update public.repayment_proofs
  set
    status = 'verified',
    reviewed_at = now(),
    reviewed_by = v_actor_id,
    review_notes = nullif(btrim(coalesce(p_review_notes, '')), ''),
    updated_at = now()
  where id = p_proof_id;

  update public.loan_repayment_schedules
  set
    status = 'verified',
    updated_at = now()
  where id = v_proof.repayment_schedule_id;

  v_new_loan_status := case
    when v_new_balance = 0 then 'paid'::public.active_loan_status
    when v_proof.active_loan_status = 'overdue'
      and not exists (
        select 1
        from public.loan_repayment_schedules
        where active_loan_id = v_proof.active_loan_id
          and status = 'late'
      )
      then 'active'::public.active_loan_status
    else v_proof.active_loan_status
  end;

  update public.active_loans
  set
    outstanding_balance = v_new_balance,
    status = v_new_loan_status,
    updated_at = now()
  where id = v_proof.active_loan_id;

  perform app_private.write_audit_log(
    'repayment_proof_verified',
    'repayment_proofs',
    p_proof_id,
    jsonb_build_object(
      'repayment_schedule_id', v_proof.repayment_schedule_id,
      'active_loan_id', v_proof.active_loan_id,
      'proof_id', p_proof_id
    )
  );

  perform app_private.write_audit_log(
    'repayment_verified',
    'loan_repayment_schedules',
    v_proof.repayment_schedule_id,
    jsonb_build_object(
      'repayment_schedule_id', v_proof.repayment_schedule_id,
      'proof_id', p_proof_id,
      'active_loan_id', v_proof.active_loan_id,
      'amount_due', v_proof.amount_due
    )
  );

  perform app_private.write_audit_log(
    'loan_balance_updated',
    'active_loans',
    v_proof.active_loan_id,
    jsonb_build_object(
      'repayment_schedule_id', v_proof.repayment_schedule_id,
      'proof_id', p_proof_id,
      'active_loan_id', v_proof.active_loan_id,
      'previous_balance', v_proof.outstanding_balance,
      'new_balance', v_new_balance
    )
  );

  if v_proof.active_loan_status = 'overdue'
    and v_new_loan_status = 'active'
  then
    perform app_private.write_audit_log(
      'loan_restored_active',
      'active_loans',
      v_proof.active_loan_id,
      jsonb_build_object(
        'repayment_schedule_id', v_proof.repayment_schedule_id,
        'proof_id', p_proof_id,
        'active_loan_id', v_proof.active_loan_id,
        'previous_status', v_proof.active_loan_status,
        'new_status', v_new_loan_status
      )
    );
  end if;

  if v_new_loan_status = 'paid' then
    perform app_private.write_audit_log(
      'loan_paid',
      'active_loans',
      v_proof.active_loan_id,
      jsonb_build_object(
        'repayment_schedule_id', v_proof.repayment_schedule_id,
        'proof_id', p_proof_id,
        'active_loan_id', v_proof.active_loan_id
      )
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'message', 'Repayment verified.',
    'proof_id', p_proof_id,
    'active_loan_id', v_proof.active_loan_id,
    'outstanding_balance', v_new_balance,
    'loan_status', v_new_loan_status
  );
end;
$$;

grant execute on function app_private.refresh_overdue_repayment_statuses()
  to authenticated;
grant execute on function public.refresh_overdue_repayment_statuses()
  to authenticated;
