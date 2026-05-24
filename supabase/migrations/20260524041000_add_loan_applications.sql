do $$
begin
  if not exists (select 1 from pg_type where typname = 'application_status') then
    create type public.application_status as enum ('submitted', 'open');
  end if;

  if not exists (select 1 from pg_type where typname = 'preferred_term') then
    create type public.preferred_term as enum (
      '1_month',
      '3_months',
      '6_months',
      '12_months'
    );
  end if;
end
$$;

create table public.loan_applications (
  id uuid primary key default gen_random_uuid(),
  borrower_id uuid not null references auth.users (id) on delete cascade,
  borrower_portfolio_id uuid not null references public.borrower_portfolios (id) on delete restrict,
  requested_amount numeric(12, 2) not null check (requested_amount >= 1000 and requested_amount <= 1000000),
  purpose text not null check (char_length(purpose) between 10 and 160),
  preferred_term public.preferred_term not null,
  remarks text check (remarks is null or char_length(remarks) <= 500),
  status public.application_status not null default 'submitted',
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index loan_applications_borrower_id_idx
  on public.loan_applications (borrower_id);

create index loan_applications_status_submitted_at_idx
  on public.loan_applications (status, submitted_at desc);

alter table public.loan_applications enable row level security;

create policy "loan_applications_select_own"
  on public.loan_applications for select
  to authenticated
  using ((select auth.uid()) = borrower_id);

create policy "loan_applications_insert_own"
  on public.loan_applications for insert
  to authenticated
  with check ((select auth.uid()) = borrower_id);

create policy "loan_applications_select_submitted_for_lender_demo"
  on public.loan_applications for select
  to authenticated
  using (status in ('submitted', 'open'));
