create or replace function app_private.lender_has_offer_on_application(
  p_application_id uuid,
  p_lender_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.loan_offers
    where loan_application_id = p_application_id
      and lender_id = p_lender_id
  );
$$;

create or replace function app_private.portfolio_has_lender_offer(
  p_portfolio_id uuid,
  p_lender_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.loan_applications
    join public.loan_offers
      on loan_offers.loan_application_id = loan_applications.id
    where loan_applications.borrower_portfolio_id = p_portfolio_id
      and loan_offers.lender_id = p_lender_id
  );
$$;

drop policy if exists "loan_applications_select_access"
  on public.loan_applications;
drop policy if exists "borrower_portfolios_select_access"
  on public.borrower_portfolios;

create policy "loan_applications_select_access"
  on public.loan_applications for select
  to authenticated
  using (
    (select auth.uid()) = borrower_id
    or app_private.is_manager((select auth.uid()))
    or (
      app_private.is_approved_lender((select auth.uid()))
      and (
        status in ('submitted', 'open')
        or app_private.lender_has_offer_on_application(
          id,
          (select auth.uid())
        )
      )
    )
  );

create policy "borrower_portfolios_select_access"
  on public.borrower_portfolios for select
  to authenticated
  using (
    (select auth.uid()) = borrower_id
    or app_private.is_manager((select auth.uid()))
    or (
      app_private.is_approved_lender((select auth.uid()))
      and (
        app_private.portfolio_has_open_application(id)
        or app_private.portfolio_has_lender_offer(
          id,
          (select auth.uid())
        )
      )
    )
  );

create unique index if not exists loan_offers_one_pending_per_lender_application_idx
  on public.loan_offers (loan_application_id, lender_id)
  where status = 'pending';

grant execute on function app_private.lender_has_offer_on_application(uuid, uuid)
  to authenticated;
grant execute on function app_private.portfolio_has_lender_offer(uuid, uuid)
  to authenticated;
