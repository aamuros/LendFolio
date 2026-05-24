-- Sprint 0 schema draft for review only.
-- Do not apply as a production migration until ADI-6 schema and RLS decisions are confirmed.

create type public.app_role as enum ('borrower', 'lender', 'manager');
create type public.business_type as enum (
  'sari_sari_store',
  'food_stall',
  'online_seller',
  'market_vendor',
  'service_provider',
  'other'
);
create type public.application_status as enum (
  'draft',
  'submitted',
  'under_review',
  'offered',
  'accepted',
  'declined',
  'withdrawn'
);
create type public.offer_status as enum ('sent', 'accepted', 'rejected', 'expired');
create type public.loan_status as enum ('active', 'completed', 'defaulted', 'cancelled');
create type public.repayment_status as enum ('pending', 'submitted', 'verified', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.borrower_portfolios (
  id uuid primary key default gen_random_uuid(),
  borrower_id uuid not null unique references public.profiles (id) on delete cascade,
  business_type public.business_type not null,
  location text not null,
  monthly_gross_revenue numeric(12, 2) not null check (monthly_gross_revenue >= 0),
  monthly_expenses numeric(12, 2) not null check (monthly_expenses >= 0),
  existing_loan_payments numeric(12, 2) not null default 0 check (existing_loan_payments >= 0),
  years_in_operation numeric(5, 2) not null check (years_in_operation >= 0),
  loan_purpose_context text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lender_profiles (
  id uuid primary key default gen_random_uuid(),
  lender_id uuid not null references public.profiles (id) on delete cascade,
  organization_name text,
  verification_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.loan_applications (
  id uuid primary key default gen_random_uuid(),
  borrower_id uuid not null references public.profiles (id),
  borrower_portfolio_id uuid references public.borrower_portfolios (id),
  status public.application_status not null default 'draft',
  requested_amount numeric(12, 2),
  requested_term_months integer,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  loan_application_id uuid not null references public.loan_applications (id),
  lender_profile_id uuid not null references public.lender_profiles (id),
  status public.offer_status not null default 'sent',
  offered_amount numeric(12, 2),
  term_months integer,
  sent_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.active_loans (
  id uuid primary key default gen_random_uuid(),
  accepted_offer_id uuid not null unique references public.offers (id),
  borrower_id uuid not null references public.profiles (id),
  lender_profile_id uuid not null references public.lender_profiles (id),
  status public.loan_status not null default 'active',
  started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.repayment_schedules (
  id uuid primary key default gen_random_uuid(),
  active_loan_id uuid not null references public.active_loans (id) on delete cascade,
  due_date date not null,
  amount_due numeric(12, 2) not null,
  status public.repayment_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.repayment_proofs (
  id uuid primary key default gen_random_uuid(),
  repayment_schedule_id uuid not null references public.repayment_schedules (id) on delete cascade,
  borrower_id uuid not null references public.profiles (id),
  storage_bucket text not null default 'repayment-proofs',
  storage_path text not null,
  status public.repayment_status not null default 'submitted',
  submitted_at timestamptz not null default now(),
  verified_by uuid references public.profiles (id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles (id),
  action text not null,
  target_table text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.borrower_portfolios enable row level security;
alter table public.lender_profiles enable row level security;
alter table public.loan_applications enable row level security;
alter table public.offers enable row level security;
alter table public.active_loans enable row level security;
alter table public.repayment_schedules enable row level security;
alter table public.repayment_proofs enable row level security;
alter table public.audit_logs enable row level security;

-- Policy draft examples only. Final policies need review against the confirmed access model.
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

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
