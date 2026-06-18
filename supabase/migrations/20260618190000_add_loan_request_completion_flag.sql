alter table public.borrower_portfolios
  add column if not exists loan_request_completed boolean not null default false;
