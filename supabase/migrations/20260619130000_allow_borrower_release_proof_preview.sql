drop policy if exists "storage_repayment_proofs_borrower_release_select"
  on storage.objects;
drop policy if exists "storage_repayment_proofs_lender_release_select"
  on storage.objects;

create policy "storage_repayment_proofs_borrower_release_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'repayment-proofs'
    and split_part(name, '/', 1) = 'lenders'
    and split_part(name, '/', 3) = 'loans'
    and split_part(name, '/', 5) = 'release'
    and char_length(split_part(name, '/', 6)) > 0
    and app_private.is_borrower((select auth.uid()))
    and exists (
      select 1
      from public.active_loans
      where active_loans.id::text = split_part(storage.objects.name, '/', 4)
        and active_loans.borrower_id = (select auth.uid())
        and active_loans.release_proof_url = storage.objects.name
    )
  );

create policy "storage_repayment_proofs_lender_release_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'repayment-proofs'
    and split_part(name, '/', 1) = 'lenders'
    and split_part(name, '/', 2) = (select auth.uid())::text
    and split_part(name, '/', 3) = 'loans'
    and split_part(name, '/', 5) = 'release'
    and char_length(split_part(name, '/', 6)) > 0
    and app_private.is_approved_lender((select auth.uid()))
    and exists (
      select 1
      from public.active_loans
      where active_loans.id::text = split_part(storage.objects.name, '/', 4)
        and active_loans.lender_id = (select auth.uid())
        and active_loans.release_proof_url = storage.objects.name
    )
  );
