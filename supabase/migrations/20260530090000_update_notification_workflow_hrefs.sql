-- Update notification hrefs to point to specific workflow tabs and items
-- instead of generic /borrower or /lender paths.

create or replace function app_private.create_loan_offer(
  p_loan_application_id uuid,
  p_approved_amount numeric,
  p_repayment_amount numeric,
  p_fees numeric,
  p_due_date date,
  p_remarks text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_application record;
  v_lender_name text;
  v_offer_id uuid;
begin
  if v_actor_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Sign in to continue.'
    );
  end if;

  if not app_private.is_approved_lender(v_actor_id) then
    return jsonb_build_object(
      'ok', false,
      'message', 'Only approved lenders can send offers.'
    );
  end if;

  if p_loan_application_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Choose an application before sending an offer.'
    );
  end if;

  if p_approved_amount is null
    or p_approved_amount < 1000
    or p_approved_amount > 1000000
  then
    return jsonb_build_object(
      'ok', false,
      'message', 'Approved amount must be between PHP 1,000 and PHP 1,000,000.'
    );
  end if;

  if p_repayment_amount is null
    or p_repayment_amount < 1000
    or p_repayment_amount > 1500000
  then
    return jsonb_build_object(
      'ok', false,
      'message', 'Repayment amount must be between PHP 1,000 and PHP 1,500,000.'
    );
  end if;

  if p_fees is null or p_fees < 0 or p_fees > 500000 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Fees must be between PHP 0 and PHP 500,000.'
    );
  end if;

  if p_repayment_amount < p_approved_amount then
    return jsonb_build_object(
      'ok', false,
      'message', 'Repayment amount must be at least the approved amount.'
    );
  end if;

  if p_fees > p_repayment_amount then
    return jsonb_build_object(
      'ok', false,
      'message', 'Fees cannot exceed the repayment amount.'
    );
  end if;

  if p_due_date is null or p_due_date <= current_date then
    return jsonb_build_object(
      'ok', false,
      'message', 'Choose a future due date.'
    );
  end if;

  if p_remarks is not null and char_length(p_remarks) > 500 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Keep remarks under 500 characters.'
    );
  end if;

  select
    loan_applications.id,
    loan_applications.borrower_id,
    loan_applications.requested_amount,
    loan_applications.status
  into v_application
  from public.loan_applications
  where loan_applications.id = p_loan_application_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'This application is not available for offers.'
    );
  end if;

  if p_approved_amount > v_application.requested_amount then
    return jsonb_build_object(
      'ok', false,
      'message', 'Approved amount cannot exceed the requested amount.'
    );
  end if;

  if v_application.status not in ('submitted', 'open') then
    return jsonb_build_object(
      'ok', false,
      'message', 'This application is not open for offers.'
    );
  end if;

  if exists (
    select 1
    from public.loan_offers
    where loan_application_id = v_application.id
      and status = 'accepted'
  ) then
    return jsonb_build_object(
      'ok', false,
      'message', 'This application already has an accepted offer.'
    );
  end if;

  if exists (
    select 1
    from public.loan_offers
    where loan_application_id = v_application.id
      and lender_id = v_actor_id
      and status = 'pending'
  ) then
    return jsonb_build_object(
      'ok', false,
      'message', 'You already have a pending offer for this application.'
    );
  end if;

  select coalesce(
    nullif(btrim(lender_profiles.organization_name), ''),
    profiles.display_name,
    'Verified lender'
  )
  into v_lender_name
  from public.profiles
  left join public.lender_profiles
    on lender_profiles.user_id = profiles.id
  where profiles.id = v_actor_id;

  insert into public.loan_offers (
    loan_application_id,
    borrower_id,
    lender_id,
    lender_name,
    approved_amount,
    repayment_amount,
    fees,
    due_date,
    remarks,
    status
  )
  values (
    v_application.id,
    v_application.borrower_id,
    v_actor_id,
    coalesce(v_lender_name, 'Verified lender'),
    round(p_approved_amount, 2),
    round(p_repayment_amount, 2),
    round(p_fees, 2),
    p_due_date,
    nullif(btrim(coalesce(p_remarks, '')), ''),
    'pending'
  )
  returning id into v_offer_id;

  perform app_private.try_create_notification(
    v_application.borrower_id,
    'offer_received',
    'New loan offer received',
    'A lender sent an offer for your loan application.',
    '/borrower?tab=offers&offerId=' || v_offer_id
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Offer sent.',
    'offer_id', v_offer_id,
    'loan_application_id', v_application.id
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'ok', false,
      'message', 'You already have a pending offer for this application.'
    );
  when check_violation then
    return jsonb_build_object(
      'ok', false,
      'message', 'Review the offer details before sending.'
    );
end;
$$;

create or replace function app_private.accept_loan_offer(p_offer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_application_id uuid;
  v_offer record;
  v_active_loan_id uuid;
  v_existing_active_loan_id uuid;
  v_declined_count integer := 0;
  v_declined_lender_ids uuid[] := '{}'::uuid[];
  v_declined_lender_id uuid;
  v_schedule_inserted_count integer := 0;
  v_installment_count integer := 1;
  v_installment_number integer;
  v_regular_amount numeric(12, 2);
  v_installment_amount numeric(12, 2);
  v_installment_due_date date;
  v_loan_created boolean := false;
begin
  if v_actor_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Sign in to continue.'
    );
  end if;

  select loan_application_id
  into v_application_id
  from public.loan_offers
  where id = p_offer_id;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not accept this offer.'
    );
  end if;

  perform pg_advisory_xact_lock(hashtext(v_application_id::text));

  select
    loan_offers.id,
    loan_offers.loan_application_id,
    loan_offers.borrower_id,
    loan_offers.lender_id,
    loan_offers.approved_amount,
    loan_offers.repayment_amount,
    loan_offers.fees,
    loan_offers.due_date,
    loan_offers.status as offer_status,
    loan_applications.status as application_status,
    loan_applications.preferred_term
  into v_offer
  from public.loan_applications
  join public.loan_offers
    on loan_offers.loan_application_id = loan_applications.id
  where loan_offers.id = p_offer_id
  for update of loan_applications, loan_offers;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not accept this offer.'
    );
  end if;

  if v_offer.borrower_id <> v_actor_id then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not accept this offer.'
    );
  end if;

  select id
  into v_existing_active_loan_id
  from public.active_loans
  where loan_application_id = v_offer.loan_application_id
    and accepted_offer_id = v_offer.id;

  if v_offer.offer_status = 'accepted'
    and v_offer.application_status = 'accepted'
    and v_existing_active_loan_id is not null
  then
    return jsonb_build_object(
      'ok', true,
      'message', 'Offer already accepted.',
      'loan_application_id', v_offer.loan_application_id,
      'accepted_offer_id', v_offer.id,
      'active_loan_id', v_existing_active_loan_id,
      'declined_offer_count', 0
    );
  end if;

  if v_offer.offer_status <> 'pending' then
    return jsonb_build_object(
      'ok', false,
      'message', 'This offer is no longer pending.'
    );
  end if;

  if v_offer.application_status not in ('submitted', 'open') then
    return jsonb_build_object(
      'ok', false,
      'message', 'This application is no longer open.'
    );
  end if;

  v_installment_count := case v_offer.preferred_term
    when '1_month' then 1
    when '3_months' then 3
    when '6_months' then 6
    when '12_months' then 12
    else 1
  end;
  v_regular_amount := round(v_offer.repayment_amount / v_installment_count, 2);

  update public.loan_offers
  set
    status = 'accepted',
    updated_at = now()
  where id = v_offer.id;

  select coalesce(array_agg(lender_id), '{}'::uuid[])
  into v_declined_lender_ids
  from public.loan_offers
  where loan_application_id = v_offer.loan_application_id
    and id <> v_offer.id
    and status = 'pending';

  update public.loan_offers
  set
    status = 'declined',
    updated_at = now()
  where loan_application_id = v_offer.loan_application_id
    and id <> v_offer.id
    and status = 'pending';

  get diagnostics v_declined_count = row_count;

  update public.loan_applications
  set
    status = 'accepted',
    updated_at = now()
  where id = v_offer.loan_application_id
    and borrower_id = v_actor_id
    and status in ('submitted', 'open');

  insert into public.active_loans (
    loan_application_id,
    accepted_offer_id,
    borrower_id,
    lender_id,
    principal_amount,
    repayment_amount,
    fees,
    outstanding_balance,
    status,
    due_date
  )
  values (
    v_offer.loan_application_id,
    v_offer.id,
    v_offer.borrower_id,
    v_offer.lender_id,
    v_offer.approved_amount,
    v_offer.repayment_amount,
    v_offer.fees,
    v_offer.repayment_amount,
    'active',
    v_offer.due_date
  )
  on conflict (loan_application_id) do nothing
  returning id into v_active_loan_id;

  if v_active_loan_id is not null then
    v_loan_created := true;
  else
    select id
    into v_active_loan_id
    from public.active_loans
    where loan_application_id = v_offer.loan_application_id
      and accepted_offer_id = v_offer.id;
  end if;

  if v_active_loan_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'This application already has an active loan.'
    );
  end if;

  for v_installment_number in 1..v_installment_count loop
    if v_installment_number = v_installment_count then
      v_installment_amount :=
        v_offer.repayment_amount - (v_regular_amount * (v_installment_count - 1));
    else
      v_installment_amount := v_regular_amount;
    end if;

    v_installment_due_date :=
      (v_offer.due_date::timestamp
        - ((v_installment_count - v_installment_number) || ' months')::interval
      )::date;

    insert into public.loan_repayment_schedules (
      active_loan_id,
      borrower_id,
      lender_id,
      installment_number,
      amount_due,
      due_date,
      status
    )
    values (
      v_active_loan_id,
      v_offer.borrower_id,
      v_offer.lender_id,
      v_installment_number,
      v_installment_amount,
      v_installment_due_date,
      'due'
    )
    on conflict (active_loan_id, installment_number) do nothing;

    if found then
      v_schedule_inserted_count := v_schedule_inserted_count + 1;
    end if;
  end loop;

  perform app_private.write_audit_log(
    'offer_accepted',
    'loan_offers',
    v_offer.id,
    jsonb_build_object('loan_application_id', v_offer.loan_application_id)
  );

  if v_declined_count > 0 then
    perform app_private.write_audit_log(
      'competing_offers_declined',
      'loan_applications',
      v_offer.loan_application_id,
      jsonb_build_object('declined_count', v_declined_count)
    );
  end if;

  perform app_private.write_audit_log(
    'application_accepted',
    'loan_applications',
    v_offer.loan_application_id,
    jsonb_build_object('accepted_offer_id', v_offer.id)
  );

  if v_loan_created then
    perform app_private.write_audit_log(
      'loan_activated',
      'active_loans',
      v_active_loan_id,
      jsonb_build_object(
        'loan_application_id', v_offer.loan_application_id,
        'accepted_offer_id', v_offer.id
      )
    );
  end if;

  if v_schedule_inserted_count > 0 then
    perform app_private.write_audit_log(
      'repayment_schedule_created',
      'loan_repayment_schedules',
      v_active_loan_id,
      jsonb_build_object(
        'loan_application_id', v_offer.loan_application_id,
        'accepted_offer_id', v_offer.id,
        'installment_count', v_schedule_inserted_count
      )
    );
  end if;

  perform app_private.try_create_notification(
    v_offer.lender_id,
    'offer_accepted',
    'Offer accepted',
    'A borrower accepted your loan offer.',
    '/lender?tab=offers&offerId=' || v_offer.id
  );

  foreach v_declined_lender_id in array v_declined_lender_ids loop
    perform app_private.try_create_notification(
      v_declined_lender_id,
      'offer_declined',
      'Offer declined',
      'A borrower accepted another offer for this application.',
      '/lender?tab=offers'
    );
  end loop;

  return jsonb_build_object(
    'ok', true,
    'message', 'Offer accepted. Active loan created.',
    'loan_application_id', v_offer.loan_application_id,
    'accepted_offer_id', v_offer.id,
    'active_loan_id', v_active_loan_id,
    'declined_offer_count', v_declined_count
  );
end;
$$;

create or replace function app_private.decline_loan_offer(p_offer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_offer record;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_borrower(v_actor_id) then
    return jsonb_build_object('ok', false, 'message', 'Could not decline offer.');
  end if;

  select
    loan_offers.id,
    loan_offers.loan_application_id,
    loan_offers.borrower_id,
    loan_offers.lender_id,
    loan_offers.status as offer_status,
    loan_applications.status as application_status
  into v_offer
  from public.loan_offers
  join public.loan_applications
    on loan_applications.id = loan_offers.loan_application_id
  where loan_offers.id = p_offer_id
  for update of loan_offers, loan_applications;

  if not found or v_offer.borrower_id <> v_actor_id then
    return jsonb_build_object('ok', false, 'message', 'Could not decline offer.');
  end if;

  if v_offer.offer_status <> 'pending' then
    return jsonb_build_object('ok', false, 'message', 'This offer is no longer pending.');
  end if;

  if v_offer.application_status not in ('submitted', 'open') then
    return jsonb_build_object('ok', false, 'message', 'This application is no longer open.');
  end if;

  update public.loan_offers
  set
    status = 'declined',
    updated_at = now()
  where id = p_offer_id;

  perform app_private.write_audit_log(
    'offer_declined',
    'loan_offers',
    p_offer_id,
    jsonb_build_object('loan_application_id', v_offer.loan_application_id)
  );

  perform app_private.try_create_notification(
    v_offer.lender_id,
    'offer_declined',
    'Offer declined',
    'A borrower declined your loan offer.',
    '/lender?tab=offers&offerId=' || p_offer_id
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Offer declined.',
    'loan_application_id', v_offer.loan_application_id,
    'declined_offer_id', p_offer_id
  );
end;
$$;

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
    'application/pdf'
  ) then
    return jsonb_build_object(
      'ok', false,
      'message', 'Upload a JPG, PNG, WebP, or PDF file.'
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

create or replace function app_private.refresh_overdue_repayment_statuses()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_late_repayment_count integer := 0;
  v_overdue_loan_count integer := 0;
  v_restored_loan_count integer := 0;
  v_paid_loan_count integer := 0;
begin
  if v_actor_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Sign in to continue.',
      'late_repayment_count', 0,
      'overdue_loan_count', 0,
      'restored_loan_count', 0,
      'paid_loan_count', 0
    );
  end if;

  if not app_private.is_manager(v_actor_id) then
    return jsonb_build_object(
      'ok', false,
      'message', 'Only managers can refresh overdue statuses.',
      'late_repayment_count', 0,
      'overdue_loan_count', 0,
      'restored_loan_count', 0,
      'paid_loan_count', 0
    );
  end if;

  create temporary table overdue_refresh_late_schedules (
    id uuid primary key,
    active_loan_id uuid not null,
    previous_status public.repayment_status not null
  ) on commit drop;

  create temporary table overdue_refresh_overdue_loans (
    id uuid primary key,
    previous_status public.active_loan_status not null
  ) on commit drop;

  create temporary table overdue_refresh_restored_loans (
    id uuid primary key,
    previous_status public.active_loan_status not null
  ) on commit drop;

  create temporary table overdue_refresh_paid_loans (
    id uuid primary key,
    previous_status public.active_loan_status not null
  ) on commit drop;

  with target as (
    select id, active_loan_id, status as previous_status
    from public.loan_repayment_schedules
    where due_date < current_date
      and status in ('due', 'rejected')
    for update
  ),
  changed as (
    update public.loan_repayment_schedules
    set
      status = 'late',
      updated_at = now()
    from target
    where loan_repayment_schedules.id = target.id
    returning
      loan_repayment_schedules.id,
      loan_repayment_schedules.active_loan_id,
      target.previous_status
  )
  insert into overdue_refresh_late_schedules (id, active_loan_id, previous_status)
  select id, active_loan_id, previous_status
  from changed;

  get diagnostics v_late_repayment_count = row_count;

  insert into public.audit_logs (actor_id, action, target_table, target_id, metadata)
  select
    v_actor_id,
    'repayment_marked_late',
    'loan_repayment_schedules',
    id,
    jsonb_build_object(
      'active_loan_id', active_loan_id,
      'previous_status', previous_status,
      'new_status', 'late'
    )
  from overdue_refresh_late_schedules;

  perform app_private.try_create_notification(
    loan_repayment_schedules.borrower_id,
    'repayment_late',
    'Repayment is late',
    'A repayment is past due. Upload payment proof when ready.',
    '/borrower?tab=loans&repaymentId=' || overdue_refresh_late_schedules.id::text
  )
  from overdue_refresh_late_schedules
  join public.loan_repayment_schedules
    on loan_repayment_schedules.id = overdue_refresh_late_schedules.id;

  with target as (
    select id, status as previous_status
    from public.active_loans
    where status = 'active'
      and exists (
        select 1
        from public.loan_repayment_schedules
        where loan_repayment_schedules.active_loan_id = active_loans.id
          and loan_repayment_schedules.status = 'late'
      )
    for update
  ),
  changed as (
    update public.active_loans
    set
      status = 'overdue',
      updated_at = now()
    from target
    where active_loans.id = target.id
    returning active_loans.id, target.previous_status
  )
  insert into overdue_refresh_overdue_loans (id, previous_status)
  select id, previous_status
  from changed;

  get diagnostics v_overdue_loan_count = row_count;

  insert into public.audit_logs (actor_id, action, target_table, target_id, metadata)
  select
    v_actor_id,
    'loan_marked_overdue',
    'active_loans',
    id,
    jsonb_build_object('previous_status', previous_status, 'new_status', 'overdue')
  from overdue_refresh_overdue_loans;

  perform app_private.try_create_notification(
    active_loans.lender_id,
    'loan_overdue',
    'Loan is overdue',
    'A borrower loan has an overdue repayment.',
    '/lender?tab=offers'
  )
  from overdue_refresh_overdue_loans
  join public.active_loans
    on active_loans.id = overdue_refresh_overdue_loans.id;

  with target as (
    select id, status as previous_status
    from public.active_loans
    where status <> 'paid'
      and outstanding_balance = 0
      and exists (
        select 1
        from public.loan_repayment_schedules
        where loan_repayment_schedules.active_loan_id = active_loans.id
      )
      and not exists (
        select 1
        from public.loan_repayment_schedules
        where loan_repayment_schedules.active_loan_id = active_loans.id
          and loan_repayment_schedules.status <> 'verified'
      )
    for update
  ),
  changed as (
    update public.active_loans
    set
      status = 'paid',
      updated_at = now()
    from target
    where active_loans.id = target.id
    returning active_loans.id, target.previous_status
  )
  insert into overdue_refresh_paid_loans (id, previous_status)
  select id, previous_status
  from changed;

  get diagnostics v_paid_loan_count = row_count;

  insert into public.audit_logs (actor_id, action, target_table, target_id, metadata)
  select
    v_actor_id,
    'loan_paid',
    'active_loans',
    id,
    jsonb_build_object('previous_status', previous_status, 'new_status', 'paid')
  from overdue_refresh_paid_loans;

  with target as (
    select id, status as previous_status
    from public.active_loans
    where status = 'overdue'
      and outstanding_balance > 0
      and not exists (
        select 1
        from public.loan_repayment_schedules
        where loan_repayment_schedules.active_loan_id = active_loans.id
          and loan_repayment_schedules.status = 'late'
      )
    for update
  ),
  changed as (
    update public.active_loans
    set
      status = 'active',
      updated_at = now()
    from target
    where active_loans.id = target.id
    returning active_loans.id, target.previous_status
  )
  insert into overdue_refresh_restored_loans (id, previous_status)
  select id, previous_status
  from changed;

  get diagnostics v_restored_loan_count = row_count;

  insert into public.audit_logs (actor_id, action, target_table, target_id, metadata)
  select
    v_actor_id,
    'loan_restored_active',
    'active_loans',
    id,
    jsonb_build_object('previous_status', previous_status, 'new_status', 'active')
  from overdue_refresh_restored_loans;

  return jsonb_build_object(
    'ok', true,
    'message', 'Overdue statuses refreshed.',
    'late_repayment_count', v_late_repayment_count,
    'overdue_loan_count', v_overdue_loan_count,
    'restored_loan_count', v_restored_loan_count,
    'paid_loan_count', v_paid_loan_count
  );
end;
$$;
