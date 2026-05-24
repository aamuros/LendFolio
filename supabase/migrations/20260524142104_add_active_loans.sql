do $$
begin
  if not exists (select 1 from pg_type where typname = 'active_loan_status') then
    create type public.active_loan_status as enum (
      'active',
      'paid',
      'overdue',
      'defaulted',
      'closed'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'repayment_status') then
    create type public.repayment_status as enum (
      'due',
      'submitted',
      'verified',
      'rejected',
      'late'
    );
  end if;
end
$$;

do $$
begin
  alter table public.loan_offers
    add constraint loan_offers_id_application_unique
    unique (id, loan_application_id);
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.active_loans (
  id uuid primary key default gen_random_uuid(),
  loan_application_id uuid not null references public.loan_applications (id) on delete restrict,
  accepted_offer_id uuid not null references public.loan_offers (id) on delete restrict,
  borrower_id uuid not null references public.profiles (id) on delete restrict,
  lender_id uuid not null references public.profiles (id) on delete restrict,
  principal_amount numeric(12, 2) not null check (principal_amount > 0),
  repayment_amount numeric(12, 2) not null check (repayment_amount > 0),
  fees numeric(12, 2) not null default 0 check (fees >= 0),
  outstanding_balance numeric(12, 2) not null check (outstanding_balance >= 0),
  status public.active_loan_status not null default 'active',
  started_at timestamptz not null default now(),
  due_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint active_loans_one_per_application unique (loan_application_id),
  constraint active_loans_one_per_accepted_offer unique (accepted_offer_id),
  constraint active_loans_repayment_covers_principal check (repayment_amount >= principal_amount),
  constraint active_loans_offer_application_match foreign key (
    accepted_offer_id,
    loan_application_id
  ) references public.loan_offers (id, loan_application_id)
);

create table if not exists public.loan_repayment_schedules (
  id uuid primary key default gen_random_uuid(),
  active_loan_id uuid not null references public.active_loans (id) on delete cascade,
  borrower_id uuid not null references public.profiles (id) on delete restrict,
  lender_id uuid not null references public.profiles (id) on delete restrict,
  installment_number integer not null check (installment_number > 0),
  amount_due numeric(12, 2) not null check (amount_due > 0),
  due_date date not null,
  status public.repayment_status not null default 'due',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint loan_repayment_schedules_installment_unique unique (
    active_loan_id,
    installment_number
  )
);

create index if not exists active_loans_borrower_status_idx
  on public.active_loans (borrower_id, status, due_date);

create index if not exists active_loans_lender_status_idx
  on public.active_loans (lender_id, status, due_date);

create index if not exists loan_repayment_schedules_borrower_status_idx
  on public.loan_repayment_schedules (borrower_id, status, due_date);

create index if not exists loan_repayment_schedules_lender_status_idx
  on public.loan_repayment_schedules (lender_id, status, due_date);

alter table public.active_loans enable row level security;
alter table public.loan_repayment_schedules enable row level security;

drop policy if exists "active_loans_select_access"
  on public.active_loans;
drop policy if exists "loan_repayment_schedules_select_access"
  on public.loan_repayment_schedules;

create policy "active_loans_select_access"
  on public.active_loans for select
  to authenticated
  using (
    (select auth.uid()) = borrower_id
    or (
      (select auth.uid()) = lender_id
      and app_private.is_approved_lender((select auth.uid()))
    )
    or app_private.is_manager((select auth.uid()))
  );

create policy "loan_repayment_schedules_select_access"
  on public.loan_repayment_schedules for select
  to authenticated
  using (
    (select auth.uid()) = borrower_id
    or (
      (select auth.uid()) = lender_id
      and app_private.is_approved_lender((select auth.uid()))
    )
    or app_private.is_manager((select auth.uid()))
  );

grant select on public.active_loans to authenticated;
grant select on public.loan_repayment_schedules to authenticated;
revoke insert, update, delete on public.active_loans from authenticated;
revoke insert, update, delete on public.loan_repayment_schedules from authenticated;

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
    loan_applications.status as application_status
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
    1,
    v_offer.repayment_amount,
    v_offer.due_date,
    'due'
  )
  on conflict (active_loan_id, installment_number) do nothing;

  get diagnostics v_schedule_inserted_count = row_count;

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
