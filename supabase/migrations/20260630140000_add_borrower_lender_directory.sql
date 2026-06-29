create or replace function public.list_approved_lenders_for_borrowers()
returns table (
  id uuid,
  organization_name text,
  operating_area text,
  min_loan_amount numeric,
  max_loan_amount numeric,
  typical_repayment_terms text,
  lender_description text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    lp.id,
    lp.organization_name,
    lp.operating_area,
    lp.min_loan_amount,
    lp.max_loan_amount,
    lp.typical_repayment_terms,
    lp.lender_description
  from public.lender_profiles lp
  where lp.verification_status = 'approved'
    and lp.organization_name is not null
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'borrower'
        and p.status = 'active'
    )
  order by lp.organization_name;
$$;

revoke all on function public.list_approved_lenders_for_borrowers() from public;
grant execute on function public.list_approved_lenders_for_borrowers() to authenticated;
