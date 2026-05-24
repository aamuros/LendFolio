alter type public.offer_status add value if not exists 'accepted';
alter type public.offer_status add value if not exists 'declined';

alter table public.loan_offers
  add column lender_name text not null default 'Verified lender'
  check (char_length(lender_name) between 2 and 120);

revoke update on public.loan_offers from authenticated;
grant update (status, updated_at) on public.loan_offers to authenticated;

create policy "loan_offers_update_borrower_acceptance_demo"
  on public.loan_offers for update
  to authenticated
  using (
    (select auth.uid()) = borrower_id
    and status = 'pending'
  )
  with check (
    (select auth.uid()) = borrower_id
    and status::text in ('accepted', 'declined')
  );
