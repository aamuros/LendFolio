do $$
begin
  if not exists (select 1 from pg_type where typname = 'business_type') then
    create type public.business_type as enum (
      'sari_sari_store',
      'food_stall',
      'online_seller',
      'market_vendor',
      'service_provider',
      'other'
    );
  end if;
end
$$;

create table public.borrower_portfolios (
  id uuid primary key default gen_random_uuid(),
  borrower_id uuid not null unique references auth.users (id) on delete cascade,
  business_type public.business_type not null,
  location text not null check (char_length(location) between 3 and 120),
  monthly_gross_revenue numeric(12, 2) not null check (monthly_gross_revenue >= 0),
  monthly_expenses numeric(12, 2) not null check (monthly_expenses >= 0),
  existing_loan_payments numeric(12, 2) not null default 0 check (existing_loan_payments >= 0),
  years_in_operation numeric(5, 2) not null check (years_in_operation >= 0 and years_in_operation <= 100),
  loan_purpose_context text not null check (char_length(loan_purpose_context) between 20 and 800),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.borrower_portfolios enable row level security;

create policy "borrower_portfolios_select_own"
  on public.borrower_portfolios for select
  to authenticated
  using ((select auth.uid()) = borrower_id);

create policy "borrower_portfolios_insert_own"
  on public.borrower_portfolios for insert
  to authenticated
  with check ((select auth.uid()) = borrower_id);

create policy "borrower_portfolios_update_own"
  on public.borrower_portfolios for update
  to authenticated
  using ((select auth.uid()) = borrower_id)
  with check ((select auth.uid()) = borrower_id);
