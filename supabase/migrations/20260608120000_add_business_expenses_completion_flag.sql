alter table public.borrower_portfolios
  add column if not exists business_expenses_completed boolean not null default false;

update public.borrower_portfolios
set business_expenses_completed = true
where monthly_expenses is not null
  and coalesce(monthly_gross_revenue, 0) > 0;
