alter table public.borrower_portfolios
  alter column business_type drop not null,
  alter column location drop not null,
  alter column monthly_gross_revenue drop not null,
  alter column monthly_expenses drop not null,
  alter column existing_loan_payments drop not null,
  alter column years_in_operation drop not null,
  alter column loan_purpose_context drop not null;

alter table public.borrower_portfolios
  alter column location drop default,
  alter column monthly_gross_revenue drop default,
  alter column monthly_expenses drop default,
  alter column existing_loan_payments drop default,
  alter column years_in_operation drop default;

alter table public.borrower_portfolios
  drop constraint if exists borrower_portfolios_location_check,
  drop constraint if exists borrower_portfolios_monthly_gross_revenue_check,
  drop constraint if exists borrower_portfolios_monthly_expenses_check,
  drop constraint if exists borrower_portfolios_existing_loan_payments_check,
  drop constraint if exists borrower_portfolios_years_in_operation_check,
  drop constraint if exists borrower_portfolios_loan_purpose_context_check;

alter table public.borrower_portfolios
  add constraint borrower_portfolios_location_check
    check (location is null or char_length(location) between 3 and 120),
  add constraint borrower_portfolios_monthly_gross_revenue_check
    check (monthly_gross_revenue is null or monthly_gross_revenue >= 0),
  add constraint borrower_portfolios_monthly_expenses_check
    check (monthly_expenses is null or monthly_expenses >= 0),
  add constraint borrower_portfolios_existing_loan_payments_check
    check (existing_loan_payments is null or existing_loan_payments >= 0),
  add constraint borrower_portfolios_years_in_operation_check
    check (
      years_in_operation is null
      or (years_in_operation >= 0 and years_in_operation <= 100)
    ),
  add constraint borrower_portfolios_loan_purpose_context_check
    check (
      loan_purpose_context is null
      or char_length(loan_purpose_context) between 3 and 800
    );
