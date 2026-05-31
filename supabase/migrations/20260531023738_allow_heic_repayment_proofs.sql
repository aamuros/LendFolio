alter table public.repayment_proofs
  drop constraint if exists repayment_proofs_file_type_check;

alter table public.repayment_proofs
  add constraint repayment_proofs_file_type_check check (
    file_type in (
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
      'application/pdf'
    )
  );

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf'
]
where id = 'repayment-proofs';

create or replace function app_private.submit_repayment_proof(
  p_repayment_schedule_id uuid,
  p_storage_path text,
  p_file_name text,
  p_file_type text,
  p_file_size integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_schedule record;
  v_proof_id uuid;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_borrower(v_actor_id) then
    return jsonb_build_object(
      'ok', false,
      'message', 'Only borrowers can upload repayment proof.'
    );
  end if;

  if p_file_size <= 0 or p_file_size > 5242880 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Upload a file up to 5 MB.'
    );
  end if;

  if p_file_type not in (
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf'
  ) then
    return jsonb_build_object(
      'ok', false,
      'message', 'Upload a JPG, PNG, WebP, HEIC, or PDF file.'
    );
  end if;

  select
    loan_repayment_schedules.id as repayment_schedule_id,
    loan_repayment_schedules.active_loan_id,
    loan_repayment_schedules.borrower_id,
    loan_repayment_schedules.lender_id,
    loan_repayment_schedules.status as repayment_status,
    active_loans.status as active_loan_status
  into v_schedule
  from public.loan_repayment_schedules
  join public.active_loans
    on active_loans.id = loan_repayment_schedules.active_loan_id
  where loan_repayment_schedules.id = p_repayment_schedule_id
  for update of loan_repayment_schedules, active_loans;

  if not found or v_schedule.borrower_id <> v_actor_id then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not upload proof for this repayment.'
    );
  end if;

  if v_schedule.repayment_status = 'verified' then
    return jsonb_build_object(
      'ok', false,
      'message', 'This repayment is already verified.'
    );
  end if;

  if v_schedule.active_loan_status not in ('active', 'overdue') then
    return jsonb_build_object(
      'ok', false,
      'message', 'This loan is not active.'
    );
  end if;

  if v_schedule.repayment_status = 'submitted' then
    return jsonb_build_object(
      'ok', false,
      'message', 'A proof is already waiting for lender review.'
    );
  end if;

  if v_schedule.repayment_status not in ('due', 'late', 'rejected') then
    return jsonb_build_object(
      'ok', false,
      'message', 'This repayment is not ready for proof upload.'
    );
  end if;

  if exists (
    select 1
    from public.repayment_proofs
    where repayment_schedule_id = p_repayment_schedule_id
      and status = 'submitted'
  ) then
    return jsonb_build_object(
      'ok', false,
      'message', 'A proof is already waiting for lender review.'
    );
  end if;

  if exists (
    select 1
    from public.repayment_proofs
    where repayment_schedule_id = p_repayment_schedule_id
      and status = 'verified'
  ) then
    return jsonb_build_object(
      'ok', false,
      'message', 'This repayment is already verified.'
    );
  end if;

  if p_storage_path <> concat(
    'borrowers/',
    v_actor_id::text,
    '/loans/',
    v_schedule.active_loan_id::text,
    '/repayments/',
    p_repayment_schedule_id::text,
    '/',
    split_part(p_storage_path, '/', 7)
  ) then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not confirm the proof upload path.'
    );
  end if;

  insert into public.repayment_proofs (
    repayment_schedule_id,
    active_loan_id,
    borrower_id,
    lender_id,
    storage_path,
    file_name,
    file_type,
    file_size,
    status
  )
  values (
    p_repayment_schedule_id,
    v_schedule.active_loan_id,
    v_schedule.borrower_id,
    v_schedule.lender_id,
    p_storage_path,
    p_file_name,
    p_file_type,
    p_file_size,
    'submitted'
  )
  returning id into v_proof_id;

  update public.loan_repayment_schedules
  set
    status = 'submitted',
    updated_at = now()
  where id = p_repayment_schedule_id;

  perform app_private.write_audit_log(
    'repayment_proof_submitted',
    'repayment_proofs',
    v_proof_id,
    jsonb_build_object(
      'repayment_schedule_id', p_repayment_schedule_id,
      'active_loan_id', v_schedule.active_loan_id,
      'proof_id', v_proof_id
    )
  );

  perform app_private.try_create_notification(
    v_schedule.lender_id,
    'repayment_proof_submitted',
    'Repayment proof submitted',
    'A borrower submitted repayment proof for review.',
    '/lender?tab=offers&proofId=' || v_proof_id
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Proof submitted for lender review.',
    'proof_id', v_proof_id,
    'active_loan_id', v_schedule.active_loan_id
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'ok', false,
      'message', 'A proof is already waiting for lender review.'
    );
end;
$$;
