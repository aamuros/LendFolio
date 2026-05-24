create or replace function app_private.borrower_owns_portfolio(
  p_portfolio_id uuid,
  p_borrower_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.borrower_portfolios
    where id = p_portfolio_id
      and borrower_id = p_borrower_id
  );
$$;

create or replace function app_private.portfolio_has_open_application(
  p_portfolio_id uuid
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
    where borrower_portfolio_id = p_portfolio_id
      and status in ('submitted', 'open')
  );
$$;

create or replace function app_private.can_offer_on_application(
  p_application_id uuid,
  p_borrower_id uuid
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
    where id = p_application_id
      and borrower_id = p_borrower_id
      and status in ('submitted', 'open')
  );
$$;

drop policy if exists "borrower_portfolios_select_access"
  on public.borrower_portfolios;
drop policy if exists "loan_applications_insert_own_borrower"
  on public.loan_applications;
drop policy if exists "loan_offers_insert_approved_lender"
  on public.loan_offers;

create policy "borrower_portfolios_select_access"
  on public.borrower_portfolios for select
  to authenticated
  using (
    (select auth.uid()) = borrower_id
    or app_private.is_manager((select auth.uid()))
    or (
      app_private.is_approved_lender((select auth.uid()))
      and app_private.portfolio_has_open_application(id)
    )
  );

create policy "loan_applications_insert_own_borrower"
  on public.loan_applications for insert
  to authenticated
  with check (
    (select auth.uid()) = borrower_id
    and app_private.is_borrower((select auth.uid()))
    and status = 'submitted'
    and app_private.borrower_owns_portfolio(
      borrower_portfolio_id,
      (select auth.uid())
    )
  );

create policy "loan_offers_insert_approved_lender"
  on public.loan_offers for insert
  to authenticated
  with check (
    (select auth.uid()) = lender_id
    and app_private.is_approved_lender((select auth.uid()))
    and status = 'pending'
    and app_private.can_offer_on_application(
      loan_application_id,
      borrower_id
    )
  );

grant execute on function app_private.borrower_owns_portfolio(uuid, uuid)
  to authenticated;
grant execute on function app_private.portfolio_has_open_application(uuid)
  to authenticated;
grant execute on function app_private.can_offer_on_application(uuid, uuid)
  to authenticated;
