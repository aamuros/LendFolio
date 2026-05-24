create policy "borrower_portfolios_select_for_lender_review_demo"
  on public.borrower_portfolios for select
  to authenticated
  using (
    exists (
      select 1
      from public.loan_applications
      where loan_applications.borrower_portfolio_id = borrower_portfolios.id
        and loan_applications.status in ('submitted', 'open')
    )
  );
