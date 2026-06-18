alter table public.active_loans
  add column if not exists release_proof_url text,
  add column if not exists release_proof_file_name text,
  add column if not exists release_proof_file_type text,
  add column if not exists release_proof_file_size integer;

drop policy if exists "storage_repayment_proofs_lender_release_insert"
  on storage.objects;
drop policy if exists "storage_repayment_proofs_lender_release_select"
  on storage.objects;
drop policy if exists "storage_repayment_proofs_lender_release_delete"
  on storage.objects;
drop policy if exists "storage_repayment_proofs_manager_release_select"
  on storage.objects;

create policy "storage_repayment_proofs_lender_release_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'repayment-proofs'
    and split_part(name, '/', 1) = 'lenders'
    and split_part(name, '/', 2) = (select auth.uid())::text
    and split_part(name, '/', 3) = 'loans'
    and split_part(name, '/', 4) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and split_part(name, '/', 5) = 'release'
    and char_length(split_part(name, '/', 6)) > 0
    and app_private.is_approved_lender((select auth.uid()))
    and exists (
      select 1
      from public.active_loans
      where active_loans.id = split_part(storage.objects.name, '/', 4)::uuid
        and active_loans.lender_id = (select auth.uid())
        and active_loans.disbursement_status in ('awaiting_release', 'released_by_lender')
        and active_loans.status not in ('paid', 'closed', 'defaulted')
    )
  );

create policy "storage_repayment_proofs_lender_release_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'repayment-proofs'
    and app_private.is_approved_lender((select auth.uid()))
    and exists (
      select 1
      from public.active_loans
      where active_loans.release_proof_url = storage.objects.name
        and active_loans.lender_id = (select auth.uid())
    )
  );

create policy "storage_repayment_proofs_lender_release_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'repayment-proofs'
    and split_part(name, '/', 1) = 'lenders'
    and split_part(name, '/', 2) = (select auth.uid())::text
    and split_part(name, '/', 3) = 'loans'
    and split_part(name, '/', 5) = 'release'
    and app_private.is_approved_lender((select auth.uid()))
    and exists (
      select 1
      from public.active_loans
      where active_loans.id = split_part(storage.objects.name, '/', 4)::uuid
        and active_loans.lender_id = (select auth.uid())
    )
  );

create policy "storage_repayment_proofs_manager_release_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'repayment-proofs'
    and app_private.is_manager((select auth.uid()))
    and exists (
      select 1
      from public.active_loans
      where active_loans.release_proof_url = storage.objects.name
    )
  );

create or replace function app_private.mark_loan_funds_released(
  p_active_loan_id uuid,
  p_disbursement_method text default null,
  p_disbursement_reference text default null,
  p_disbursement_notes text default null,
  p_release_proof_path text default null,
  p_release_proof_file_name text default null,
  p_release_proof_file_type text default null,
  p_release_proof_file_size integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_loan record;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_approved_lender(v_actor_id) then
    return jsonb_build_object('ok', false, 'message', 'Only approved lenders can release funds.');
  end if;

  if nullif(trim(coalesce(p_disbursement_method, '')), '') is null then
    return jsonb_build_object('ok', false, 'message', 'Choose a release method.');
  end if;

  if p_release_proof_path is not null then
    if nullif(trim(p_release_proof_path), '') is null then
      return jsonb_build_object('ok', false, 'message', 'Could not confirm the release proof path.');
    end if;

    if p_release_proof_file_type not in ('image/png', 'image/jpeg', 'image/webp', 'application/pdf') then
      return jsonb_build_object('ok', false, 'message', 'Upload a PNG, JPG, WEBP, or PDF file.');
    end if;

    if coalesce(p_release_proof_file_size, 0) <= 0 or p_release_proof_file_size > 5242880 then
      return jsonb_build_object('ok', false, 'message', 'Release proof must be 5MB or smaller.');
    end if;
  end if;

  select id, borrower_id, lender_id, loan_application_id, disbursement_status, status
  into v_loan
  from public.active_loans
  where id = p_active_loan_id
  for update;

  if not found or v_loan.lender_id <> v_actor_id then
    return jsonb_build_object('ok', false, 'message', 'Could not update this loan.');
  end if;

  if v_loan.status in ('paid', 'closed', 'defaulted') then
    return jsonb_build_object('ok', false, 'message', 'This loan is already closed.');
  end if;

  if v_loan.disbursement_status = 'received_by_borrower' then
    return jsonb_build_object('ok', false, 'message', 'The borrower already confirmed receipt.');
  end if;

  update public.active_loans
  set
    disbursement_status = 'released_by_lender',
    disbursed_at = coalesce(disbursed_at, now()),
    disbursement_method = nullif(trim(p_disbursement_method), ''),
    disbursement_reference = nullif(trim(p_disbursement_reference), ''),
    disbursement_notes = nullif(trim(p_disbursement_notes), ''),
    release_proof_url = nullif(trim(p_release_proof_path), ''),
    release_proof_file_name = nullif(trim(p_release_proof_file_name), ''),
    release_proof_file_type = nullif(trim(p_release_proof_file_type), ''),
    release_proof_file_size = p_release_proof_file_size,
    updated_at = now()
  where id = p_active_loan_id;

  perform app_private.write_audit_log(
    'loan_funds_released',
    'active_loans',
    p_active_loan_id,
    jsonb_build_object(
      'loan_application_id', v_loan.loan_application_id,
      'borrower_id', v_loan.borrower_id,
      'lender_id', v_loan.lender_id,
      'has_release_proof', p_release_proof_path is not null
    )
  );

  perform app_private.try_create_notification(
    v_loan.borrower_id,
    'loan_funds_released',
    'Funds released',
    'Your lender marked the loan funds as released. Confirm when you receive the money.',
    '/borrower?tab=loans&loanId=' || p_active_loan_id::text
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Funds marked as released.',
    'active_loan_id', p_active_loan_id
  );
end;
$$;

create or replace function public.mark_loan_funds_released(
  p_active_loan_id uuid,
  p_disbursement_method text default null,
  p_disbursement_reference text default null,
  p_disbursement_notes text default null,
  p_release_proof_path text default null,
  p_release_proof_file_name text default null,
  p_release_proof_file_type text default null,
  p_release_proof_file_size integer default null
)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select app_private.mark_loan_funds_released(
    p_active_loan_id,
    p_disbursement_method,
    p_disbursement_reference,
    p_disbursement_notes,
    p_release_proof_path,
    p_release_proof_file_name,
    p_release_proof_file_type,
    p_release_proof_file_size
  );
$$;

grant execute on function app_private.mark_loan_funds_released(uuid, text, text, text, text, text, text, integer) to authenticated;
grant execute on function public.mark_loan_funds_released(uuid, text, text, text, text, text, text, integer) to authenticated;
