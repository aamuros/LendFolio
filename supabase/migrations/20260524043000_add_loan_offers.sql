do $$
begin
  if not exists (select 1 from pg_type where typname = 'offer_status') then
    create type public.offer_status as enum ('pending');
  end if;
end
$$;

create table public.loan_offers (
  id uuid primary key default gen_random_uuid(),
  loan_application_id uuid not null references public.loan_applications (id) on delete cascade,
  borrower_id uuid not null references auth.users (id) on delete cascade,
  lender_id uuid not null references auth.users (id) on delete cascade,
  approved_amount numeric(12, 2) not null check (approved_amount >= 1000 and approved_amount <= 1000000),
  repayment_amount numeric(12, 2) not null check (repayment_amount >= approved_amount),
  fees numeric(12, 2) not null default 0 check (fees >= 0 and fees <= repayment_amount),
  due_date date not null,
  remarks text check (remarks is null or char_length(remarks) <= 500),
  status public.offer_status not null default 'pending',
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index loan_offers_application_id_idx
  on public.loan_offers (loan_application_id);

create index loan_offers_borrower_status_idx
  on public.loan_offers (borrower_id, status);

create index loan_offers_lender_status_idx
  on public.loan_offers (lender_id, status);

alter table public.loan_offers enable row level security;

create policy "loan_offers_select_borrower_or_lender_demo"
  on public.loan_offers for select
  to authenticated
  using (
    (select auth.uid()) = borrower_id
    or (select auth.uid()) = lender_id
  );

create policy "loan_offers_insert_lender_demo"
  on public.loan_offers for insert
  to authenticated
  with check (
    (select auth.uid()) = lender_id
    and status = 'pending'
    and exists (
      select 1
      from public.loan_applications
      where loan_applications.id = loan_offers.loan_application_id
        and loan_applications.borrower_id = loan_offers.borrower_id
        and loan_applications.status in ('submitted', 'open')
    )
  );
