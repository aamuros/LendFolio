create schema if not exists app_private;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('borrower', 'lender', 'manager');
  end if;

  if not exists (select 1 from pg_type where typname = 'profile_status') then
    create type public.profile_status as enum ('active', 'pending', 'suspended');
  end if;

  if not exists (select 1 from pg_type where typname = 'lender_verification_status') then
    create type public.lender_verification_status as enum (
      'pending',
      'approved',
      'rejected'
    );
  end if;
end
$$;

alter type public.application_status add value if not exists 'accepted';
alter type public.application_status add value if not exists 'declined';
alter type public.application_status add value if not exists 'withdrawn';
alter type public.offer_status add value if not exists 'expired';

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null,
  display_name text not null check (char_length(display_name) between 2 and 120),
  status public.profile_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lender_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  organization_name text not null check (char_length(organization_name) between 2 and 160),
  verification_status public.lender_verification_status not null default 'pending',
  approved_at timestamptz,
  approved_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (verification_status = 'approved' and approved_at is not null)
    or (verification_status <> 'approved')
  )
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null check (char_length(action) between 3 and 120),
  target_table text not null check (char_length(target_table) between 2 and 120),
  target_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists profiles_role_status_idx
  on public.profiles (role, status);

create index if not exists lender_profiles_user_status_idx
  on public.lender_profiles (user_id, verification_status);

create index if not exists audit_logs_target_created_at_idx
  on public.audit_logs (target_table, target_id, created_at desc);

create unique index if not exists loan_offers_one_accepted_per_application_idx
  on public.loan_offers (loan_application_id)
  where status = 'accepted';

alter table public.profiles enable row level security;
alter table public.lender_profiles enable row level security;
alter table public.audit_logs enable row level security;

create or replace function app_private.has_role(p_user_id uuid, p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = p_user_id
      and role = p_role
      and status = 'active'
  );
$$;

create or replace function app_private.is_manager(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app_private.has_role(p_user_id, 'manager');
$$;

create or replace function app_private.is_borrower(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app_private.has_role(p_user_id, 'borrower');
$$;

create or replace function app_private.is_approved_lender(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    join public.lender_profiles on lender_profiles.user_id = profiles.id
    where profiles.id = p_user_id
      and profiles.role = 'lender'
      and profiles.status = 'active'
      and lender_profiles.verification_status = 'approved'
  );
$$;

create or replace function app_private.write_audit_log(
  p_action text,
  p_target_table text,
  p_target_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
begin
  insert into public.audit_logs (
    actor_id,
    action,
    target_table,
    target_id,
    metadata
  )
  values (
    v_actor_id,
    p_action,
    p_target_table,
    p_target_id,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function app_private.audit_foundation_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_action text;
begin
  if tg_table_name = 'profiles' and tg_op = 'INSERT' then
    v_action := 'profile_created';
  elsif tg_table_name = 'profiles' and tg_op = 'UPDATE' then
    v_action := 'profile_updated';
  elsif tg_table_name = 'borrower_portfolios' and tg_op = 'INSERT' then
    v_action := 'profile_created';
  elsif tg_table_name = 'borrower_portfolios' and tg_op = 'UPDATE' then
    v_action := 'profile_updated';
  elsif tg_table_name = 'loan_applications' and tg_op = 'INSERT' then
    v_action := 'application_submitted';
  elsif tg_table_name = 'loan_offers' and tg_op = 'INSERT' then
    v_action := 'offer_created';
  else
    return new;
  end if;

  perform app_private.write_audit_log(
    v_action,
    tg_table_name,
    new.id,
    jsonb_build_object('operation', tg_op)
  );

  return new;
end;
$$;

drop trigger if exists profiles_audit_trigger on public.profiles;
create trigger profiles_audit_trigger
  after insert or update on public.profiles
  for each row execute function app_private.audit_foundation_change();

drop trigger if exists borrower_portfolios_audit_trigger on public.borrower_portfolios;
create trigger borrower_portfolios_audit_trigger
  after insert or update on public.borrower_portfolios
  for each row execute function app_private.audit_foundation_change();

drop trigger if exists loan_applications_audit_trigger on public.loan_applications;
create trigger loan_applications_audit_trigger
  after insert on public.loan_applications
  for each row execute function app_private.audit_foundation_change();

drop trigger if exists loan_offers_audit_trigger on public.loan_offers;
create trigger loan_offers_audit_trigger
  after insert on public.loan_offers
  for each row execute function app_private.audit_foundation_change();

drop policy if exists "profiles_select_access" on public.profiles;
drop policy if exists "profiles_insert_own_borrower" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_manager_update" on public.profiles;
drop policy if exists "lender_profiles_select_access" on public.lender_profiles;
drop policy if exists "lender_profiles_manager_write" on public.lender_profiles;
drop policy if exists "audit_logs_manager_select" on public.audit_logs;

create policy "profiles_select_access"
  on public.profiles for select
  to authenticated
  using (
    (select auth.uid()) = id
    or app_private.is_manager((select auth.uid()))
  );

create policy "profiles_insert_own_borrower"
  on public.profiles for insert
  to authenticated
  with check (
    (select auth.uid()) = id
    and role = 'borrower'
    and status = 'active'
  );

create policy "profiles_manager_update"
  on public.profiles for update
  to authenticated
  using (app_private.is_manager((select auth.uid())))
  with check (app_private.is_manager((select auth.uid())));

create policy "lender_profiles_select_access"
  on public.lender_profiles for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or app_private.is_manager((select auth.uid()))
  );

create policy "lender_profiles_manager_write"
  on public.lender_profiles for all
  to authenticated
  using (app_private.is_manager((select auth.uid())))
  with check (app_private.is_manager((select auth.uid())));

create policy "audit_logs_manager_select"
  on public.audit_logs for select
  to authenticated
  using (app_private.is_manager((select auth.uid())));

drop policy if exists "borrower_portfolios_select_own" on public.borrower_portfolios;
drop policy if exists "borrower_portfolios_insert_own" on public.borrower_portfolios;
drop policy if exists "borrower_portfolios_update_own" on public.borrower_portfolios;
drop policy if exists "borrower_portfolios_select_for_lender_review_demo" on public.borrower_portfolios;

create policy "borrower_portfolios_select_access"
  on public.borrower_portfolios for select
  to authenticated
  using (
    (select auth.uid()) = borrower_id
    or app_private.is_manager((select auth.uid()))
    or (
      app_private.is_approved_lender((select auth.uid()))
      and exists (
        select 1
        from public.loan_applications
        where loan_applications.borrower_portfolio_id = borrower_portfolios.id
          and loan_applications.status in ('submitted', 'open')
      )
    )
  );

create policy "borrower_portfolios_insert_own_borrower"
  on public.borrower_portfolios for insert
  to authenticated
  with check (
    (select auth.uid()) = borrower_id
    and app_private.is_borrower((select auth.uid()))
  );

create policy "borrower_portfolios_update_own_borrower"
  on public.borrower_portfolios for update
  to authenticated
  using (
    (select auth.uid()) = borrower_id
    and app_private.is_borrower((select auth.uid()))
  )
  with check (
    (select auth.uid()) = borrower_id
    and app_private.is_borrower((select auth.uid()))
  );

drop policy if exists "loan_applications_select_own" on public.loan_applications;
drop policy if exists "loan_applications_insert_own" on public.loan_applications;
drop policy if exists "loan_applications_select_submitted_for_lender_demo" on public.loan_applications;

create policy "loan_applications_select_access"
  on public.loan_applications for select
  to authenticated
  using (
    (select auth.uid()) = borrower_id
    or app_private.is_manager((select auth.uid()))
    or (
      app_private.is_approved_lender((select auth.uid()))
      and status in ('submitted', 'open')
    )
  );

create policy "loan_applications_insert_own_borrower"
  on public.loan_applications for insert
  to authenticated
  with check (
    (select auth.uid()) = borrower_id
    and app_private.is_borrower((select auth.uid()))
    and status = 'submitted'
    and exists (
      select 1
      from public.borrower_portfolios
      where borrower_portfolios.id = loan_applications.borrower_portfolio_id
        and borrower_portfolios.borrower_id = (select auth.uid())
    )
  );

drop policy if exists "loan_offers_select_borrower_or_lender_demo" on public.loan_offers;
drop policy if exists "loan_offers_insert_lender_demo" on public.loan_offers;
drop policy if exists "loan_offers_update_borrower_acceptance_demo" on public.loan_offers;

create policy "loan_offers_select_access"
  on public.loan_offers for select
  to authenticated
  using (
    (select auth.uid()) = borrower_id
    or (select auth.uid()) = lender_id
    or app_private.is_manager((select auth.uid()))
  );

create policy "loan_offers_insert_approved_lender"
  on public.loan_offers for insert
  to authenticated
  with check (
    (select auth.uid()) = lender_id
    and app_private.is_approved_lender((select auth.uid()))
    and status = 'pending'
    and exists (
      select 1
      from public.loan_applications
      where loan_applications.id = loan_offers.loan_application_id
        and loan_applications.borrower_id = loan_offers.borrower_id
        and loan_applications.status in ('submitted', 'open')
    )
  );

revoke update on public.loan_offers from authenticated;
revoke update on public.loan_applications from authenticated;

grant usage on schema app_private to authenticated;
grant execute on function app_private.has_role(uuid, public.app_role) to authenticated;
grant execute on function app_private.is_manager(uuid) to authenticated;
grant execute on function app_private.is_borrower(uuid) to authenticated;
grant execute on function app_private.is_approved_lender(uuid) to authenticated;
