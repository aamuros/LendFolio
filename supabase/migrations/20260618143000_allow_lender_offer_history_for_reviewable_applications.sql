create policy "loan_offers_select_approved_lender_review_history"
  on public.loan_offers for select
  to authenticated
  using (
    app_private.is_approved_lender((select auth.uid()))
    and exists (
      select 1
      from public.loan_applications
      where loan_applications.id = loan_offers.loan_application_id
        and loan_applications.borrower_id = loan_offers.borrower_id
        and loan_applications.status in ('submitted', 'open')
    )
  );
