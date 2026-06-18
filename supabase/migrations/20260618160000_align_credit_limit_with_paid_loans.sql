-- Align backend credit-limit accounting with the product credit helper.
-- Paid/closed loans only count as clean completed cycles when fully paid and
-- never late/defaulted. Active/overdue loans are the only loan statuses that
-- consume current credit.

alter table public.loan_repayment_schedules
  add column if not exists was_late boolean not null default false;

update public.loan_repayment_schedules
set was_late = true
where status = 'late'
  and was_late = false;

create index if not exists loan_repayment_schedules_late_history_idx
  on public.loan_repayment_schedules (active_loan_id)
  where was_late = true;

create or replace function app_private.calculate_borrower_used_credit(
  p_borrower_id uuid
)
returns numeric
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce((
      select sum(outstanding_balance)
      from public.active_loans
      where borrower_id = p_borrower_id
        and status in ('active', 'overdue')
        and outstanding_balance > 0
    ), 0)
    +
    coalesce((
      select sum(requested_amount)
      from public.loan_applications
      where borrower_id = p_borrower_id
        and status in ('submitted', 'open')
    ), 0);
$$;

create or replace function app_private.calculate_borrower_used_credit_for_application(
  p_borrower_id uuid,
  p_excluded_application_id uuid
)
returns numeric
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce((
      select sum(outstanding_balance)
      from public.active_loans
      where borrower_id = p_borrower_id
        and status in ('active', 'overdue')
        and outstanding_balance > 0
    ), 0)
    +
    coalesce((
      select sum(requested_amount)
      from public.loan_applications
      where borrower_id = p_borrower_id
        and status in ('submitted', 'open')
        and (
          p_excluded_application_id is null
          or id <> p_excluded_application_id
        )
    ), 0);
$$;

create or replace function app_private.calculate_borrower_used_credit_excluding_application(
  p_borrower_id uuid,
  p_excluded_application_id uuid default null
)
returns numeric
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app_private.calculate_borrower_used_credit_for_application(
    p_borrower_id,
    p_excluded_application_id
  );
$$;

create or replace function app_private.calculate_borrower_credit_limit_details(
  p_monthly_gross_revenue numeric,
  p_monthly_expenses numeric,
  p_existing_loan_payments numeric,
  p_years_in_operation numeric,
  p_borrower_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_household_expenses numeric := 0;
  v_monthly_net_cash_flow numeric;
  v_safe_monthly_repayment_capacity numeric;
  v_income_based_capacity numeric;
  v_repayment_history_cap numeric;
  v_calculated_credit_limit numeric;
  v_used_credit numeric := 0;
  v_available_credit numeric;
  v_clean_completed_loan_count integer := 0;
  v_late_repayment_count integer := 0;
  v_defaulted_loan_count integer := 0;
  v_risk_flags text[] := array[]::text[];
begin
  if p_borrower_id is not null then
    select coalesce(monthly_rent_or_mortgage, 0)
      + coalesce(monthly_electricity_bill, 0)
      + coalesce(monthly_water_bill, 0)
      + coalesce(monthly_internet_phone_bill, 0)
      + coalesce(monthly_food_groceries, 0)
      + coalesce(monthly_transportation, 0)
      + coalesce(monthly_tuition_education, 0)
      + coalesce(monthly_medical_expenses, 0)
      + coalesce(monthly_insurance, 0)
      + coalesce(monthly_family_support, 0)
      + coalesce(other_household_expenses, 0)
    into v_household_expenses
    from public.borrower_portfolios
    where borrower_id = p_borrower_id;

    select count(*)::integer
    into v_defaulted_loan_count
    from public.active_loans
    where borrower_id = p_borrower_id
      and status = 'defaulted';

    select count(distinct loan_repayment_schedules.active_loan_id)::integer
    into v_late_repayment_count
    from public.loan_repayment_schedules
    where borrower_id = p_borrower_id
      and was_late = true;

    select count(*)::integer
    into v_clean_completed_loan_count
    from public.active_loans
    where borrower_id = p_borrower_id
      and (status in ('paid', 'closed') or outstanding_balance <= 0)
      and status <> 'defaulted'
      and not exists (
        select 1
        from public.loan_repayment_schedules
        where loan_repayment_schedules.active_loan_id = active_loans.id
          and loan_repayment_schedules.was_late = true
      )
      and not exists (
        select 1
        from public.repayment_proofs
        join public.loan_repayment_schedules
          on loan_repayment_schedules.id = repayment_proofs.repayment_schedule_id
        where repayment_proofs.active_loan_id = active_loans.id
          and repayment_proofs.status = 'verified'
          and repayment_proofs.reviewed_at::date > loan_repayment_schedules.due_date
      );
  end if;

  v_monthly_net_cash_flow :=
    coalesce(p_monthly_gross_revenue, 0)
    - coalesce(p_monthly_expenses, 0)
    - coalesce(v_household_expenses, 0)
    - coalesce(p_existing_loan_payments, 0);
  v_safe_monthly_repayment_capacity := greatest(0, v_monthly_net_cash_flow * 0.30);
  v_income_based_capacity := v_safe_monthly_repayment_capacity * 3;
  v_repayment_history_cap := app_private.calculate_borrower_repayment_history_cap(
    v_clean_completed_loan_count,
    v_late_repayment_count,
    v_defaulted_loan_count
  );
  v_calculated_credit_limit := greatest(
    0,
    floor(least(
      v_income_based_capacity,
      v_repayment_history_cap,
      100000
    ) / 100) * 100
  );

  if p_borrower_id is not null then
    v_used_credit := app_private.calculate_borrower_used_credit(p_borrower_id);
  end if;

  v_available_credit := greatest(0, v_calculated_credit_limit - v_used_credit);

  if v_monthly_net_cash_flow <= 0 then
    v_risk_flags := array_append(v_risk_flags, 'non_positive_cash_flow');
  end if;
  if coalesce(p_monthly_expenses, 0) > coalesce(p_monthly_gross_revenue, 0) then
    v_risk_flags := array_append(v_risk_flags, 'expenses_exceed_revenue');
  end if;
  if coalesce(p_monthly_gross_revenue, 0) > 0
    and coalesce(p_existing_loan_payments, 0) / p_monthly_gross_revenue >= 0.4 then
    v_risk_flags := array_append(v_risk_flags, 'high_existing_debt_payments');
  end if;
  if coalesce(p_years_in_operation, 0) < 1 then
    v_risk_flags := array_append(v_risk_flags, 'very_new_business');
  end if;
  if v_late_repayment_count > 0 then
    v_risk_flags := array_append(v_risk_flags, 'late_repayment_history');
  end if;
  if v_defaulted_loan_count > 0 then
    v_risk_flags := array_append(v_risk_flags, 'defaulted_repayment_history');
  end if;

  return jsonb_build_object(
    'calculated_credit_limit', v_calculated_credit_limit,
    'used_credit', v_used_credit,
    'available_credit', v_available_credit,
    'monthly_net_cash_flow', v_monthly_net_cash_flow,
    'safe_monthly_repayment_capacity', floor(v_safe_monthly_repayment_capacity / 100) * 100,
    'income_based_capacity', floor(v_income_based_capacity / 100) * 100,
    'repayment_history_cap', v_repayment_history_cap,
    'maximum_cap', 100000,
    'clean_completed_loan_count', v_clean_completed_loan_count,
    'late_repayment_count', v_late_repayment_count,
    'defaulted_loan_count', v_defaulted_loan_count,
    'risk_flags', to_jsonb(v_risk_flags)
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
    return jsonb_build_object('ok', false, 'message', 'Only borrowers can upload repayment proof.');
  end if;

  if p_file_size <= 0 or p_file_size > 5242880 then
    return jsonb_build_object('ok', false, 'message', 'Upload a file up to 5 MB.');
  end if;

  if p_file_type not in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf') then
    return jsonb_build_object('ok', false, 'message', 'Upload a JPG, PNG, WebP, or PDF file.');
  end if;

  select
    loan_repayment_schedules.id as repayment_schedule_id,
    loan_repayment_schedules.active_loan_id,
    loan_repayment_schedules.borrower_id,
    loan_repayment_schedules.lender_id,
    loan_repayment_schedules.status as repayment_status,
    loan_repayment_schedules.due_date,
    active_loans.status as active_loan_status
  into v_schedule
  from public.loan_repayment_schedules
  join public.active_loans
    on active_loans.id = loan_repayment_schedules.active_loan_id
  where loan_repayment_schedules.id = p_repayment_schedule_id
  for update of loan_repayment_schedules, active_loans;

  if not found or v_schedule.borrower_id <> v_actor_id then
    return jsonb_build_object('ok', false, 'message', 'Could not upload proof for this repayment.');
  end if;

  if v_schedule.repayment_status = 'verified' then
    return jsonb_build_object('ok', false, 'message', 'This repayment is already verified.');
  end if;

  if v_schedule.active_loan_status not in ('active', 'overdue') then
    return jsonb_build_object('ok', false, 'message', 'This loan is not active.');
  end if;

  if v_schedule.repayment_status = 'submitted' then
    return jsonb_build_object('ok', false, 'message', 'A proof is already waiting for lender review.');
  end if;

  if v_schedule.repayment_status not in ('due', 'late', 'rejected') then
    return jsonb_build_object('ok', false, 'message', 'This repayment is not ready for proof upload.');
  end if;

  if exists (
    select 1
    from public.repayment_proofs
    where repayment_schedule_id = p_repayment_schedule_id
      and status = 'submitted'
  ) then
    return jsonb_build_object('ok', false, 'message', 'A proof is already waiting for lender review.');
  end if;

  if exists (
    select 1
    from public.repayment_proofs
    where repayment_schedule_id = p_repayment_schedule_id
      and status = 'verified'
  ) then
    return jsonb_build_object('ok', false, 'message', 'This repayment is already verified.');
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
    return jsonb_build_object('ok', false, 'message', 'Could not confirm the proof upload path.');
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
    was_late = was_late
      or v_schedule.repayment_status = 'late'
      or current_date > v_schedule.due_date,
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

  return jsonb_build_object(
    'ok', true,
    'message', 'Proof submitted for lender review.',
    'proof_id', v_proof_id,
    'active_loan_id', v_schedule.active_loan_id
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'message', 'A proof is already waiting for lender review.');
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
  v_all_schedules_verified boolean;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_approved_lender(v_actor_id) then
    return jsonb_build_object('ok', false, 'message', 'Only approved lenders can review repayment proof.');
  end if;

  if p_decision not in ('verified', 'rejected') then
    return jsonb_build_object('ok', false, 'message', 'Choose verify or reject.');
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
    loan_repayment_schedules.due_date,
    loan_repayment_schedules.was_late,
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
    return jsonb_build_object('ok', false, 'message', 'Could not review this proof.');
  end if;

  if v_proof.proof_status <> 'submitted' then
    return jsonb_build_object('ok', false, 'message', 'This proof has already been reviewed.');
  end if;

  if v_proof.repayment_status <> 'submitted' then
    return jsonb_build_object('ok', false, 'message', 'This repayment is not waiting for proof review.');
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
      was_late = was_late or current_date > v_proof.due_date,
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

  v_new_balance := greatest(v_proof.outstanding_balance - v_proof.amount_due, 0);

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
    was_late = was_late or current_date > v_proof.due_date,
    updated_at = now()
  where id = v_proof.repayment_schedule_id;

  select not exists (
    select 1
    from public.loan_repayment_schedules
    where active_loan_id = v_proof.active_loan_id
      and status <> 'verified'
  )
  into v_all_schedules_verified;

  v_new_loan_status := case
    when v_all_schedules_verified or v_new_balance = 0 then 'paid'::public.active_loan_status
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

  if v_new_loan_status = 'paid' then
    v_new_balance := 0;
  end if;

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

  if v_proof.active_loan_status = 'overdue' and v_new_loan_status = 'active' then
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
      'Your loan has been fully repaid.',
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
      was_late = true,
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

  with target as (
    select distinct active_loans.id, active_loans.status as previous_status
    from public.active_loans
    join overdue_refresh_late_schedules
      on overdue_refresh_late_schedules.active_loan_id = active_loans.id
    where active_loans.status = 'active'
      and active_loans.outstanding_balance > 0
    for update of active_loans
  ),
  changed as (
    update public.active_loans
    set status = 'overdue', updated_at = now()
    from target
    where active_loans.id = target.id
    returning active_loans.id, target.previous_status
  )
  insert into overdue_refresh_overdue_loans (id, previous_status)
  select id, previous_status
  from changed;

  get diagnostics v_overdue_loan_count = row_count;

  with target as (
    select active_loans.id, active_loans.status as previous_status
    from public.active_loans
    where active_loans.status = 'overdue'
      and active_loans.outstanding_balance = 0
    for update
  ),
  changed as (
    update public.active_loans
    set status = 'paid', updated_at = now()
    from target
    where active_loans.id = target.id
    returning active_loans.id, target.previous_status
  )
  insert into overdue_refresh_paid_loans (id, previous_status)
  select id, previous_status
  from changed;

  get diagnostics v_paid_loan_count = row_count;

  with target as (
    select active_loans.id, active_loans.status as previous_status
    from public.active_loans
    where active_loans.status = 'overdue'
      and active_loans.outstanding_balance > 0
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
    set status = 'active', updated_at = now()
    from target
    where active_loans.id = target.id
    returning active_loans.id, target.previous_status
  )
  insert into overdue_refresh_restored_loans (id, previous_status)
  select id, previous_status
  from changed;

  get diagnostics v_restored_loan_count = row_count;

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
  v_schedule_inserted_count integer := 0;
  v_installment_count integer := 1;
  v_installment_number integer;
  v_regular_amount numeric(12, 2);
  v_installment_amount numeric(12, 2);
  v_installment_due_date date;
  v_loan_created boolean := false;
  v_credit jsonb;
  v_available_credit numeric;
  v_portfolio record;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  select loan_application_id
  into v_application_id
  from public.loan_offers
  where id = p_offer_id;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Could not accept this offer.');
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
    loan_offers.repayment_channel,
    loan_offers.repayment_account_name,
    loan_offers.repayment_account_number,
    loan_offers.repayment_instructions,
    loan_offers.status as offer_status,
    loan_applications.status as application_status,
    loan_applications.preferred_term,
    loan_applications.borrower_portfolio_id
  into v_offer
  from public.loan_applications
  join public.loan_offers
    on loan_offers.loan_application_id = loan_applications.id
  where loan_offers.id = p_offer_id
  for update of loan_applications, loan_offers;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Could not accept this offer.');
  end if;

  if v_offer.borrower_id <> v_actor_id then
    return jsonb_build_object('ok', false, 'message', 'Could not accept this offer.');
  end if;

  perform pg_advisory_xact_lock(hashtext(v_actor_id::text));

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
    return jsonb_build_object('ok', false, 'message', 'This offer is no longer pending.');
  end if;

  if v_offer.application_status not in ('submitted', 'open') then
    return jsonb_build_object('ok', false, 'message', 'This application is no longer open.');
  end if;

  select
    borrower_portfolios.monthly_gross_revenue,
    borrower_portfolios.monthly_expenses,
    borrower_portfolios.existing_loan_payments,
    borrower_portfolios.years_in_operation
  into v_portfolio
  from public.borrower_portfolios
  where borrower_portfolios.id = v_offer.borrower_portfolio_id
    and borrower_portfolios.borrower_id = v_actor_id;

  if found then
    v_credit := app_private.calculate_borrower_credit_limit_details_for_application(
      v_portfolio.monthly_gross_revenue,
      v_portfolio.monthly_expenses,
      v_portfolio.existing_loan_payments,
      v_portfolio.years_in_operation,
      v_actor_id,
      v_offer.loan_application_id
    );

    v_available_credit := greatest(0, (v_credit->>'available_credit')::numeric);

    if v_offer.approved_amount > v_available_credit then
      return jsonb_build_object(
        'ok', false,
        'code', 'credit_limit_exceeded',
        'message', 'Accepting this offer would exceed your credit limit. The approved principal of PHP ' ||
          to_char(v_offer.approved_amount, 'FM999,999,999') || ' exceeds your available credit of PHP ' ||
          to_char(v_available_credit, 'FM999,999,999') || '.'
      )
      ||
      case
        when coalesce(current_setting('app.environment', true), '') in ('development', 'local', 'test') then
          jsonb_build_object(
            'debug',
            jsonb_build_object(
              'calculatedCreditLimit', (v_credit->>'calculated_credit_limit')::numeric,
              'usedCredit', (v_credit->>'used_credit')::numeric,
              'availableCredit', v_available_credit,
              'cleanCompletedLoanCount', (v_credit->>'clean_completed_loan_count')::integer,
              'activeLoanCredit', coalesce((
                select sum(outstanding_balance)
                from public.active_loans
                where borrower_id = v_actor_id
                  and status in ('active', 'overdue')
                  and outstanding_balance > 0
              ), 0),
              'pendingApplicationCredit', coalesce((
                select sum(requested_amount)
                from public.loan_applications
                where borrower_id = v_actor_id
                  and status in ('submitted', 'open')
                  and id <> v_offer.loan_application_id
              ), 0)
            )
          )
        else '{}'::jsonb
      end;
    end if;
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
  set status = 'accepted', updated_at = now()
  where id = v_offer.id;

  update public.loan_offers
  set status = 'declined', updated_at = now()
  where loan_application_id = v_offer.loan_application_id
    and id <> v_offer.id
    and status = 'pending';

  get diagnostics v_declined_count = row_count;

  update public.loan_applications
  set status = 'accepted', updated_at = now()
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
    due_date,
    repayment_channel,
    repayment_account_name,
    repayment_account_number,
    repayment_instructions
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
    v_offer.due_date,
    v_offer.repayment_channel,
    v_offer.repayment_account_name,
    v_offer.repayment_account_number,
    v_offer.repayment_instructions
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
    return jsonb_build_object('ok', false, 'message', 'This application already has an active loan.');
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
    'A borrower accepted your loan offer. The loan is now active.',
    '/lender/applications/' || v_offer.loan_application_id::text
  );

  perform app_private.try_create_notification(
    loan_offers.lender_id,
    'offer_declined',
    'Offer declined',
    'A borrower accepted another offer for this application.',
    '/lender/applications/' || v_offer.loan_application_id::text
  )
  from public.loan_offers
  where loan_offers.loan_application_id = v_offer.loan_application_id
    and loan_offers.id <> v_offer.id
    and loan_offers.status = 'declined';

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

grant execute on function app_private.calculate_borrower_used_credit(uuid) to authenticated;
grant execute on function app_private.calculate_borrower_used_credit_for_application(uuid, uuid) to authenticated;
grant execute on function app_private.calculate_borrower_used_credit_excluding_application(uuid, uuid) to authenticated;
