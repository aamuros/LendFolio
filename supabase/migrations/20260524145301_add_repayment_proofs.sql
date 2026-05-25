do $$
begin
  if not exists (select 1 from pg_type where typname = 'repayment_proof_status') then
    create type public.repayment_proof_status as enum (
      'submitted',
      'verified',
      'rejected'
    );
  end if;
end
$$;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'repayment-proofs',
  'repayment-proofs',
  false,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.repayment_proofs (
  id uuid primary key default gen_random_uuid(),
  repayment_schedule_id uuid not null references public.loan_repayment_schedules (id) on delete cascade,
  active_loan_id uuid not null references public.active_loans (id) on delete cascade,
  borrower_id uuid not null references public.profiles (id) on delete restrict,
  lender_id uuid not null references public.profiles (id) on delete restrict,
  storage_bucket text not null default 'repayment-proofs',
  storage_path text not null,
  file_name text not null,
  file_type text not null,
  file_size integer not null,
  status public.repayment_proof_status not null default 'submitted',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint repayment_proofs_storage_path_unique unique (storage_path),
  constraint repayment_proofs_file_size_positive check (file_size > 0),
  constraint repayment_proofs_file_size_limit check (file_size <= 5242880),
  constraint repayment_proofs_bucket_check check (storage_bucket = 'repayment-proofs'),
  constraint repayment_proofs_file_type_check check (
    file_type in (
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    )
  )
);

create unique index if not exists repayment_proofs_one_submitted_per_schedule_idx
  on public.repayment_proofs (repayment_schedule_id)
  where status = 'submitted';

create unique index if not exists repayment_proofs_one_verified_per_schedule_idx
  on public.repayment_proofs (repayment_schedule_id)
  where status = 'verified';

create index if not exists repayment_proofs_schedule_idx
  on public.repayment_proofs (repayment_schedule_id);

create index if not exists repayment_proofs_active_loan_idx
  on public.repayment_proofs (active_loan_id);

create index if not exists repayment_proofs_borrower_idx
  on public.repayment_proofs (borrower_id);

create index if not exists repayment_proofs_lender_idx
  on public.repayment_proofs (lender_id);

create index if not exists repayment_proofs_status_idx
  on public.repayment_proofs (status);

create index if not exists repayment_proofs_submitted_at_idx
  on public.repayment_proofs (submitted_at desc);

alter table public.repayment_proofs enable row level security;

drop policy if exists "repayment_proofs_select_access"
  on public.repayment_proofs;

create policy "repayment_proofs_select_access"
  on public.repayment_proofs for select
  to authenticated
  using (
    (select auth.uid()) = borrower_id
    or (
      (select auth.uid()) = lender_id
      and app_private.is_approved_lender((select auth.uid()))
    )
    or app_private.is_manager((select auth.uid()))
  );

grant select on public.repayment_proofs to authenticated;
revoke insert, update, delete on public.repayment_proofs from authenticated;

drop policy if exists "storage_repayment_proofs_borrower_insert"
  on storage.objects;
drop policy if exists "storage_repayment_proofs_borrower_select"
  on storage.objects;
drop policy if exists "storage_repayment_proofs_lender_select"
  on storage.objects;
drop policy if exists "storage_repayment_proofs_manager_select"
  on storage.objects;

create policy "storage_repayment_proofs_borrower_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'repayment-proofs'
    and split_part(name, '/', 1) = 'borrowers'
    and split_part(name, '/', 2) = (select auth.uid())::text
    and split_part(name, '/', 3) = 'loans'
    and split_part(name, '/', 4) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and split_part(name, '/', 5) = 'repayments'
    and split_part(name, '/', 6) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
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
        and active_loans.status = 'active'
        and loan_repayment_schedules.status <> 'verified'
    )
  );

create policy "storage_repayment_proofs_borrower_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'repayment-proofs'
    and exists (
      select 1
      from public.repayment_proofs
      where repayment_proofs.storage_path = storage.objects.name
        and repayment_proofs.borrower_id = (select auth.uid())
    )
  );

create policy "storage_repayment_proofs_lender_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'repayment-proofs'
    and app_private.is_approved_lender((select auth.uid()))
    and exists (
      select 1
      from public.repayment_proofs
      where repayment_proofs.storage_path = storage.objects.name
        and repayment_proofs.lender_id = (select auth.uid())
    )
  );

create policy "storage_repayment_proofs_manager_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'repayment-proofs'
    and app_private.is_manager((select auth.uid()))
    and exists (
      select 1
      from public.repayment_proofs
      where repayment_proofs.storage_path = storage.objects.name
    )
  );

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

  if v_schedule.active_loan_status <> 'active' then
    return jsonb_build_object(
      'ok', false,
      'message', 'This loan is not active.'
    );
  end if;

  if v_schedule.repayment_status = 'verified' then
    return jsonb_build_object(
      'ok', false,
      'message', 'This repayment is already verified.'
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
      'active_loan_id', v_schedule.active_loan_id
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
      'message', 'A proof is already recorded for this repayment.'
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
        'active_loan_id', v_proof.active_loan_id
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
  v_new_loan_status := case
    when v_new_balance = 0 then 'paid'::public.active_loan_status
    else v_proof.active_loan_status
  end;

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
      'active_loan_id', v_proof.active_loan_id
    )
  );

  perform app_private.write_audit_log(
    'repayment_verified',
    'loan_repayment_schedules',
    v_proof.repayment_schedule_id,
    jsonb_build_object(
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
      'proof_id', p_proof_id,
      'previous_balance', v_proof.outstanding_balance,
      'new_balance', v_new_balance
    )
  );

  if v_new_loan_status = 'paid' then
    perform app_private.write_audit_log(
      'loan_paid',
      'active_loans',
      v_proof.active_loan_id,
      jsonb_build_object('proof_id', p_proof_id)
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

create or replace function public.submit_repayment_proof(
  p_repayment_schedule_id uuid,
  p_storage_path text,
  p_file_name text,
  p_file_type text,
  p_file_size integer
)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.submit_repayment_proof(
    p_repayment_schedule_id,
    p_storage_path,
    p_file_name,
    p_file_type,
    p_file_size
  );
$$;

create or replace function public.review_repayment_proof(
  p_proof_id uuid,
  p_decision text,
  p_review_notes text default null
)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.review_repayment_proof(
    p_proof_id,
    p_decision,
    p_review_notes
  );
$$;

grant execute on function app_private.submit_repayment_proof(
  uuid,
  text,
  text,
  text,
  integer
) to authenticated;
grant execute on function app_private.review_repayment_proof(
  uuid,
  text,
  text
) to authenticated;
grant execute on function public.submit_repayment_proof(
  uuid,
  text,
  text,
  text,
  integer
) to authenticated;
grant execute on function public.review_repayment_proof(
  uuid,
  text,
  text
) to authenticated;
