drop policy if exists "storage_repayment_proofs_borrower_insert"
  on storage.objects;

create policy "storage_repayment_proofs_borrower_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'repayment-proofs'
    and split_part(name, '/', 1) = 'borrowers'
    and split_part(name, '/', 2) = (select auth.uid())::text
    and split_part(name, '/', 3) = 'loans'
    and split_part(name, '/', 4) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and split_part(name, '/', 5) = 'repayments'
    and split_part(name, '/', 6) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and char_length(split_part(name, '/', 7)) > 0
    and exists (
      select 1
      from public.loan_repayment_schedules
      join public.active_loans
        on active_loans.id = loan_repayment_schedules.active_loan_id
      where active_loans.id = split_part(storage.objects.name, '/', 4)::uuid
        and loan_repayment_schedules.id = split_part(storage.objects.name, '/', 6)::uuid
        and active_loans.borrower_id = (select auth.uid())
        and loan_repayment_schedules.borrower_id = (select auth.uid())
        and active_loans.status in ('active', 'overdue')
        and loan_repayment_schedules.status in ('due', 'late', 'rejected')
        and not exists (
          select 1
          from public.repayment_proofs
          where repayment_proofs.repayment_schedule_id = loan_repayment_schedules.id
            and repayment_proofs.status = 'submitted'
        )
    )
  );
