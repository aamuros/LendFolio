-- Wire remaining notification gaps.
-- 1. review_repayment_proof: add loan_paid and loan_restored_active notifications
-- 2. update_loan_application: notify lenders with pending offers when application changes

-- 1. review_repayment_proof: add missing transition notifications
create or replace function app_private.review_repayment_proof(
  p_proof_id uuid,
  p_decision text,
  p_review_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_proof record;
  v_new_balance numeric(12, 2);
  v_new_loan_status public.active_loan_status;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_approved_lender(v_actor_id) then
    return jsonb_build_object(
      'ok', false,
      'message', 'Only approved lenders can review repayment proof.'
    );
  end if;

  if p_decision not in ('verified', 'rejected') then
    return jsonb_build_object(
      'ok', false,
      'message', 'Choose verify or reject.'
    );
  end if;

  select
    repayment_proofs.id as proof_id,
    repayment_proofs.status as proof_status,
    repayment_proofs.repayment_schedule_id,
    repayment_proofs.active_loan_id,
    repayment_proofs.borrower_id,
    repayment_proofs.lender_id,
    loan_repayment_schedules.status as repayment_status,
    loan_repayment_schedules.amount_due,
    active_loans.status as active_loan_status,
    active_loans.outstanding_balance
  into v_proof
  from public.repayment_proofs
  join public.loan_repayment_schedules
    on loan_repayment_schedules.id = repayment_proofs.repayment_schedule_id
  join public.active_loans
    on active_loans.id = repayment_proofs.active_loan_id
  where repayment_proofs.id = p_proof_id
  for update of repayment_proofs, loan_repayment_schedules, active_loans;

  if not found or v_proof.lender_id <> v_actor_id then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not review this proof.'
    );
  end if;

  if v_proof.proof_status <> 'submitted' then
    return jsonb_build_object(
      'ok', false,
      'message', 'This proof has already been reviewed.'
    );
  end if;

  if v_proof.repayment_status <> 'submitted' then
    return jsonb_build_object(
      'ok', false,
      'message', 'This repayment is not waiting for proof review.'
    );
  end if;

  if p_decision = 'rejected' then
    update public.repayment_proofs
    set
      status = 'rejected',
      reviewed_at = now(),
      reviewed_by = v_actor_id,
      review_notes = nullif(btrim(coalesce(p_review_notes, '')), ''),
      updated_at = now()
    where id = p_proof_id;

    update public.loan_repayment_schedules
    set
      status = 'rejected',
      updated_at = now()
    where id = v_proof.repayment_schedule_id;

    perform app_private.write_audit_log(
      'repayment_proof_rejected',
      'repayment_proofs',
      p_proof_id,
      jsonb_build_object(
        'repayment_schedule_id', v_proof.repayment_schedule_id,
        'active_loan_id', v_proof.active_loan_id,
        'proof_id', p_proof_id
      )
    );

    perform app_private.try_create_notification(
      v_proof.borrower_id,
      'repayment_rejected',
      'Repayment proof rejected',
      'Your repayment proof was rejected. Upload a clearer proof to continue.',
      '/borrower?tab=loans&repaymentId=' || v_proof.repayment_schedule_id
    );

    return jsonb_build_object(
      'ok', true,
      'message', 'Proof rejected.',
      'proof_id', p_proof_id,
      'active_loan_id', v_proof.active_loan_id
    );
  end if;

  v_new_balance := greatest(
    v_proof.outstanding_balance - v_proof.amount_due,
    0
  );

  update public.repayment_proofs
  set
    status = 'verified',
    reviewed_at = now(),
    reviewed_by = v_actor_id,
    review_notes = nullif(btrim(coalesce(p_review_notes, '')), ''),
    updated_at = now()
  where id = p_proof_id;

  update public.loan_repayment_schedules
  set
    status = 'verified',
    updated_at = now()
  where id = v_proof.repayment_schedule_id;

  v_new_loan_status := case
    when v_new_balance = 0 then 'paid'::public.active_loan_status
    when v_proof.active_loan_status = 'overdue'
      and not exists (
        select 1
        from public.loan_repayment_schedules
        where active_loan_id = v_proof.active_loan_id
          and status = 'late'
      )
      then 'active'::public.active_loan_status
    else v_proof.active_loan_status
  end;

  update public.active_loans
  set
    outstanding_balance = v_new_balance,
    status = v_new_loan_status,
    updated_at = now()
  where id = v_proof.active_loan_id;

  perform app_private.write_audit_log(
    'repayment_proof_verified',
    'repayment_proofs',
    p_proof_id,
    jsonb_build_object(
      'repayment_schedule_id', v_proof.repayment_schedule_id,
      'active_loan_id', v_proof.active_loan_id,
      'proof_id', p_proof_id
    )
  );

  perform app_private.write_audit_log(
    'repayment_verified',
    'loan_repayment_schedules',
    v_proof.repayment_schedule_id,
    jsonb_build_object(
      'repayment_schedule_id', v_proof.repayment_schedule_id,
      'proof_id', p_proof_id,
      'active_loan_id', v_proof.active_loan_id,
      'amount_due', v_proof.amount_due
    )
  );

  perform app_private.write_audit_log(
    'loan_balance_updated',
    'active_loans',
    v_proof.active_loan_id,
    jsonb_build_object(
      'repayment_schedule_id', v_proof.repayment_schedule_id,
      'proof_id', p_proof_id,
      'active_loan_id', v_proof.active_loan_id,
      'previous_balance', v_proof.outstanding_balance,
      'new_balance', v_new_balance
    )
  );

  if v_proof.active_loan_status = 'overdue'
    and v_new_loan_status = 'active'
  then
    perform app_private.write_audit_log(
      'loan_restored_active',
      'active_loans',
      v_proof.active_loan_id,
      jsonb_build_object(
        'repayment_schedule_id', v_proof.repayment_schedule_id,
        'proof_id', p_proof_id,
        'active_loan_id', v_proof.active_loan_id,
        'previous_status', v_proof.active_loan_status,
        'new_status', v_new_loan_status
      )
    );

    perform app_private.try_create_notification(
      v_proof.borrower_id,
      'loan_restored_active',
      'Loan restored to active',
      'Your overdue loan has been restored to active status.',
      '/borrower?tab=loans'
    );

    perform app_private.try_create_notification(
      v_proof.lender_id,
      'loan_restored_active',
      'Loan restored to active',
      'An overdue loan has been restored to active status.',
      '/lender?tab=offers'
    );
  end if;

  if v_new_loan_status = 'paid' then
    perform app_private.write_audit_log(
      'loan_paid',
      'active_loans',
      v_proof.active_loan_id,
      jsonb_build_object(
        'repayment_schedule_id', v_proof.repayment_schedule_id,
        'proof_id', p_proof_id,
        'active_loan_id', v_proof.active_loan_id
      )
    );

    perform app_private.try_create_notification(
      v_proof.borrower_id,
      'loan_paid',
      'Loan fully paid',
      'Congratulations! Your loan has been fully repaid.',
      '/borrower?tab=loans'
    );

    perform app_private.try_create_notification(
      v_proof.lender_id,
      'loan_paid',
      'Loan fully repaid',
      'A borrower has fully repaid their loan.',
      '/lender?tab=offers'
    );
  end if;

  perform app_private.try_create_notification(
    v_proof.borrower_id,
    'repayment_verified',
    'Repayment verified',
    'Your repayment proof was verified.',
    '/borrower?tab=loans&repaymentId=' || v_proof.repayment_schedule_id
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Repayment verified.',
    'proof_id', p_proof_id,
    'active_loan_id', v_proof.active_loan_id,
    'outstanding_balance', v_new_balance,
    'loan_status', v_new_loan_status
  );
end;
$$;

-- 2. update_loan_application: notify lenders with pending offers
create or replace function app_private.update_loan_application(
  p_application_id uuid,
  p_requested_amount numeric,
  p_purpose text,
  p_preferred_term public.preferred_term,
  p_remarks text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_application record;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_borrower(v_actor_id) then
    return jsonb_build_object('ok', false, 'message', 'Could not save changes.');
  end if;

  select
    id,
    borrower_id,
    status
  into v_application
  from public.loan_applications
  where id = p_application_id
  for update;

  if not found or v_application.borrower_id <> v_actor_id then
    return jsonb_build_object('ok', false, 'message', 'Could not save changes.');
  end if;

  if v_application.status not in ('submitted', 'open') then
    return jsonb_build_object(
      'ok', false,
      'message', 'This application can no longer be edited.'
    );
  end if;

  update public.loan_applications
  set
    requested_amount = p_requested_amount,
    purpose = trim(p_purpose),
    preferred_term = p_preferred_term,
    remarks = nullif(trim(coalesce(p_remarks, '')), ''),
    updated_at = now()
  where id = p_application_id
  returning id, borrower_id, borrower_portfolio_id, requested_amount, purpose,
    preferred_term, remarks, status, submitted_at, created_at, updated_at
  into v_application;

  perform app_private.write_audit_log(
    'application_updated',
    'loan_applications',
    p_application_id,
    jsonb_build_object('status', v_application.status)
  );

  perform app_private.try_create_notification(
    loan_offers.lender_id,
    'application_updated',
    'Application updated',
    'A borrower updated their loan application. Review the changes.',
    '/lender/applications/' || p_application_id::text
  )
  from public.loan_offers
  where loan_offers.loan_application_id = p_application_id
    and loan_offers.status = 'pending';

  return jsonb_build_object(
    'ok', true,
    'message', 'Application updated.',
    'application', to_jsonb(v_application)
  );
end;
$$;
