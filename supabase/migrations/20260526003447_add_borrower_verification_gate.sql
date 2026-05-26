do $$
begin
  if not exists (select 1 from pg_type where typname = 'borrower_verification_status') then
    create type public.borrower_verification_status as enum (
      'pending',
      'approved',
      'rejected'
    );
  end if;
end
$$;

create table if not exists public.borrower_verifications (
  id uuid primary key default gen_random_uuid(),
  borrower_id uuid not null unique references public.profiles (id) on delete cascade,
  verification_status public.borrower_verification_status not null default 'pending',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id),
  manager_review_notes text,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.borrower_verifications
  drop constraint if exists borrower_verifications_review_state_valid,
  drop constraint if exists borrower_verifications_manager_review_notes_length,
  drop constraint if exists borrower_verifications_rejection_reason_length,
  add constraint borrower_verifications_review_state_valid
    check (
      (
        verification_status = 'approved'
        and reviewed_at is not null
        and reviewed_by is not null
        and rejection_reason is null
      )
      or (
        verification_status = 'rejected'
        and reviewed_at is not null
        and reviewed_by is not null
        and nullif(btrim(coalesce(rejection_reason, '')), '') is not null
      )
      or (
        verification_status = 'pending'
        and reviewed_at is null
        and reviewed_by is null
        and rejection_reason is null
      )
    ),
  add constraint borrower_verifications_manager_review_notes_length
    check (
      manager_review_notes is null
      or char_length(manager_review_notes) <= 1000
    ),
  add constraint borrower_verifications_rejection_reason_length
    check (
      rejection_reason is null
      or char_length(rejection_reason) <= 1000
    );

create index if not exists borrower_verifications_status_created_idx
  on public.borrower_verifications (verification_status, created_at desc);

create index if not exists borrower_verifications_borrower_status_idx
  on public.borrower_verifications (borrower_id, verification_status);

alter table public.borrower_verifications enable row level security;

drop policy if exists "borrower_verifications_borrower_select_own" on public.borrower_verifications;
drop policy if exists "borrower_verifications_manager_select_all" on public.borrower_verifications;

create policy "borrower_verifications_borrower_select_own"
  on public.borrower_verifications for select
  to authenticated
  using ((select auth.uid()) = borrower_id);

create policy "borrower_verifications_manager_select_all"
  on public.borrower_verifications for select
  to authenticated
  using (app_private.is_manager((select auth.uid())));

revoke insert, update, delete on public.borrower_verifications from anon;
revoke insert, update, delete on public.borrower_verifications from authenticated;

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists borrower_verifications_set_updated_at on public.borrower_verifications;
create trigger borrower_verifications_set_updated_at
  before update on public.borrower_verifications
  for each row execute function app_private.set_updated_at();

create or replace function app_private.enforce_borrower_verification_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.profiles
    where id = new.borrower_id
      and role = 'borrower'
  ) then
    raise exception 'Borrower verification must reference a borrower profile.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists borrower_verifications_borrower_profile on public.borrower_verifications;
create constraint trigger borrower_verifications_borrower_profile
  after insert or update on public.borrower_verifications
  deferrable initially immediate
  for each row execute function app_private.enforce_borrower_verification_profile();

insert into public.borrower_verifications (borrower_id, verification_status)
select profiles.id, 'pending'
from public.profiles
where profiles.role = 'borrower'
  and profiles.status = 'active'
on conflict (borrower_id) do nothing;

create or replace function app_private.is_verified_borrower(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    join public.borrower_verifications
      on borrower_verifications.borrower_id = profiles.id
    where profiles.id = p_user_id
      and profiles.role = 'borrower'
      and profiles.status = 'active'
      and borrower_verifications.verification_status = 'approved'
  );
$$;

create or replace function app_private.provision_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'lendfolio_role', '')), '');
  v_display_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
  v_organization_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'organization_name', '')), '');
  v_contact_person text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'contact_person', '')), '');
  v_phone_number text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone_number', '')), '');
  v_business_address text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'business_address', '')), '');
  v_operating_area text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'operating_area', '')), '');
  v_business_registration_number text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'business_registration_number', '')), '');
  v_min_loan_amount numeric(12, 2);
  v_max_loan_amount numeric(12, 2);
  v_typical_repayment_terms text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'typical_repayment_terms', '')), '');
  v_lender_description text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'lender_description', '')), '');
begin
  if v_role is null then
    return new;
  end if;

  if v_role not in ('borrower', 'lender') then
    raise exception 'Unsupported signup role.'
      using errcode = '23514';
  end if;

  if v_display_name is null or char_length(v_display_name) not between 2 and 120 then
    raise exception 'A valid display name is required.'
      using errcode = '23514';
  end if;

  if v_role = 'lender' then
    if v_organization_name is null
      or char_length(v_organization_name) not between 2 and 160 then
      raise exception 'A valid organization name is required.'
        using errcode = '23514';
    end if;

    if v_contact_person is null or char_length(v_contact_person) not between 2 and 120 then
      raise exception 'A valid contact person is required.'
        using errcode = '23514';
    end if;

    if v_phone_number is null or char_length(v_phone_number) not between 7 and 30 then
      raise exception 'A valid phone number is required.'
        using errcode = '23514';
    end if;

    if v_business_address is null or char_length(v_business_address) not between 5 and 240 then
      raise exception 'A valid business address is required.'
        using errcode = '23514';
    end if;

    if v_operating_area is null or char_length(v_operating_area) not between 2 and 160 then
      raise exception 'A valid operating area is required.'
        using errcode = '23514';
    end if;

    if v_business_registration_number is not null
      and char_length(v_business_registration_number) not between 2 and 80 then
      raise exception 'A valid business registration number is required.'
        using errcode = '23514';
    end if;

    begin
      v_min_loan_amount := (new.raw_user_meta_data ->> 'min_loan_amount')::numeric(12, 2);
      v_max_loan_amount := (new.raw_user_meta_data ->> 'max_loan_amount')::numeric(12, 2);
    exception
      when invalid_text_representation or numeric_value_out_of_range then
        raise exception 'Valid loan amount limits are required.'
          using errcode = '23514';
    end;

    if v_min_loan_amount is null
      or v_max_loan_amount is null
      or v_min_loan_amount <= 0
      or v_max_loan_amount <= 0
      or v_max_loan_amount < v_min_loan_amount then
      raise exception 'Valid loan amount limits are required.'
        using errcode = '23514';
    end if;

    if v_typical_repayment_terms is null
      or char_length(v_typical_repayment_terms) not between 2 and 240 then
      raise exception 'Valid repayment terms are required.'
        using errcode = '23514';
    end if;

    if v_lender_description is null
      or char_length(v_lender_description) not between 20 and 800 then
      raise exception 'A valid lender description is required.'
        using errcode = '23514';
    end if;
  end if;

  insert into public.profiles (
    id,
    role,
    display_name,
    status
  )
  values (
    new.id,
    v_role::public.app_role,
    v_display_name,
    'active'
  )
  on conflict (id) do nothing;

  if v_role = 'borrower' then
    insert into public.borrower_verifications (
      borrower_id,
      verification_status
    )
    values (
      new.id,
      'pending'
    )
    on conflict (borrower_id) do nothing;
  end if;

  if v_role = 'lender' then
    insert into public.lender_profiles (
      user_id,
      organization_name,
      contact_person,
      phone_number,
      business_address,
      operating_area,
      business_registration_number,
      min_loan_amount,
      max_loan_amount,
      typical_repayment_terms,
      lender_description,
      verification_status,
      approved_at,
      approved_by,
      rejected_at,
      rejected_by,
      rejection_reason,
      manager_review_notes
    )
    values (
      new.id,
      v_organization_name,
      v_contact_person,
      v_phone_number,
      v_business_address,
      v_operating_area,
      v_business_registration_number,
      v_min_loan_amount,
      v_max_loan_amount,
      v_typical_repayment_terms,
      v_lender_description,
      'pending',
      null,
      null,
      null,
      null,
      null,
      null
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

create or replace function app_private.review_borrower_verification(
  p_borrower_id uuid,
  p_decision text,
  p_manager_review_notes text default null,
  p_rejection_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_action text;
  v_notes text := nullif(btrim(coalesce(p_manager_review_notes, '')), '');
  v_rejection_reason text := nullif(btrim(coalesce(p_rejection_reason, '')), '');
  v_verification public.borrower_verifications%rowtype;
begin
  if v_actor_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Sign in to review borrowers.'
    );
  end if;

  if not app_private.is_manager(v_actor_id) then
    return jsonb_build_object(
      'ok', false,
      'message', 'Only managers can review borrowers.'
    );
  end if;

  if p_decision not in ('approve', 'reject', 'return_to_pending') then
    return jsonb_build_object(
      'ok', false,
      'message', 'Choose approve, reject, or return to pending.'
    );
  end if;

  if p_borrower_id = v_actor_id then
    return jsonb_build_object(
      'ok', false,
      'message', 'Managers cannot review their own borrower verification.'
    );
  end if;

  if p_decision = 'reject' and v_rejection_reason is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Rejection reason is required.'
    );
  end if;

  if v_notes is not null and char_length(v_notes) > 1000 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Review notes must be 1000 characters or fewer.'
    );
  end if;

  if v_rejection_reason is not null and char_length(v_rejection_reason) > 1000 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Rejection reason must be 1000 characters or fewer.'
    );
  end if;

  insert into public.borrower_verifications (
    borrower_id,
    verification_status
  )
  values (
    p_borrower_id,
    'pending'
  )
  on conflict (borrower_id) do nothing;

  select *
  into v_verification
  from public.borrower_verifications
  where borrower_id = p_borrower_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'Borrower verification was not found.'
    );
  end if;

  if p_decision = 'approve' then
    update public.borrower_verifications
    set
      verification_status = 'approved',
      reviewed_at = now(),
      reviewed_by = v_actor_id,
      manager_review_notes = v_notes,
      rejection_reason = null
    where id = v_verification.id
    returning * into v_verification;

    v_action := 'borrower_verification_approved';
  elsif p_decision = 'reject' then
    update public.borrower_verifications
    set
      verification_status = 'rejected',
      reviewed_at = now(),
      reviewed_by = v_actor_id,
      manager_review_notes = v_notes,
      rejection_reason = v_rejection_reason
    where id = v_verification.id
    returning * into v_verification;

    v_action := 'borrower_verification_rejected';
  else
    update public.borrower_verifications
    set
      verification_status = 'pending',
      reviewed_at = null,
      reviewed_by = null,
      manager_review_notes = v_notes,
      rejection_reason = null
    where id = v_verification.id
    returning * into v_verification;

    v_action := 'borrower_verification_returned_to_pending';
  end if;

  perform app_private.write_audit_log(
    v_action,
    'borrower_verifications',
    v_verification.id,
    jsonb_build_object(
      'borrower_id', v_verification.borrower_id,
      'verification_status', v_verification.verification_status,
      'manager_review_notes_present', v_verification.manager_review_notes is not null,
      'rejection_reason_present', v_verification.rejection_reason is not null
    )
  );

  return jsonb_build_object(
    'ok', true,
    'message', case
      when p_decision = 'approve' then 'Borrower verification approved.'
      when p_decision = 'reject' then 'Borrower verification rejected.'
      else 'Borrower verification returned to pending.'
    end,
    'borrower_id', v_verification.borrower_id,
    'borrower_verification_id', v_verification.id,
    'verification_status', v_verification.verification_status
  );
exception
  when check_violation or foreign_key_violation then
    return jsonb_build_object(
      'ok', false,
      'message', 'Borrower verification was not found.'
    );
end;
$$;

create or replace function public.review_borrower_verification(
  p_borrower_id uuid,
  p_decision text,
  p_manager_review_notes text default null,
  p_rejection_reason text default null
)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.review_borrower_verification(
    p_borrower_id,
    p_decision,
    p_manager_review_notes,
    p_rejection_reason
  );
$$;

create or replace function app_private.submit_loan_application(
  p_requested_amount numeric,
  p_purpose text,
  p_preferred_term public.preferred_term,
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
  v_available_credit numeric;
  v_credit_limit numeric;
  v_portfolio record;
  v_used_credit numeric;
begin
  if v_actor_id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'auth_required',
      'message', 'Sign in to continue.'
    );
  end if;

  if not app_private.is_borrower(v_actor_id) then
    return jsonb_build_object(
      'ok', false,
      'code', 'not_allowed',
      'message', 'Could not submit application.'
    );
  end if;

  if not app_private.is_verified_borrower(v_actor_id) then
    return jsonb_build_object(
      'ok', false,
      'code', 'borrower_verification_required',
      'message', 'Borrower verification is required before submitting a loan application.'
    );
  end if;

  if p_requested_amount is null
    or p_requested_amount < 1000
    or p_requested_amount > 1000000
  then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_amount',
      'message', 'Review the highlighted fields before submitting.'
    );
  end if;

  if p_purpose is null
    or char_length(btrim(p_purpose)) < 10
    or char_length(btrim(p_purpose)) > 160
  then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_purpose',
      'message', 'Review the highlighted fields before submitting.'
    );
  end if;

  if p_preferred_term is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_term',
      'message', 'Review the highlighted fields before submitting.'
    );
  end if;

  if p_remarks is not null and char_length(btrim(p_remarks)) > 500 then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_remarks',
      'message', 'Review the highlighted fields before submitting.'
    );
  end if;

  perform pg_advisory_xact_lock(hashtext(v_actor_id::text));

  select
    id,
    monthly_gross_revenue,
    monthly_expenses,
    existing_loan_payments,
    years_in_operation
  into v_portfolio
  from public.borrower_portfolios
  where borrower_id = v_actor_id;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'code', 'missing_portfolio',
      'message', 'Save your business profile before submitting an application.'
    );
  end if;

  v_credit_limit := app_private.calculate_borrower_credit_limit(
    v_portfolio.monthly_gross_revenue,
    v_portfolio.monthly_expenses,
    v_portfolio.existing_loan_payments,
    v_portfolio.years_in_operation
  );
  v_used_credit := app_private.calculate_borrower_used_credit(v_actor_id);
  v_available_credit := greatest(0, v_credit_limit - v_used_credit);

  if p_requested_amount > v_available_credit then
    return jsonb_build_object(
      'ok', false,
      'code', 'credit_limit_exceeded',
      'message', 'Requested amount exceeds your available credit.',
      'credit_limit', v_credit_limit,
      'used_credit', v_used_credit,
      'available_credit', v_available_credit
    );
  end if;

  insert into public.loan_applications (
    borrower_id,
    borrower_portfolio_id,
    requested_amount,
    purpose,
    preferred_term,
    remarks,
    status,
    credit_limit_at_submission,
    used_credit_at_submission,
    available_credit_at_submission
  )
  values (
    v_actor_id,
    v_portfolio.id,
    round(p_requested_amount, 2),
    btrim(p_purpose),
    p_preferred_term,
    nullif(btrim(coalesce(p_remarks, '')), ''),
    'submitted',
    round(v_credit_limit, 2),
    round(v_used_credit, 2),
    round(v_available_credit, 2)
  )
  returning id, borrower_id, borrower_portfolio_id, requested_amount, purpose,
    preferred_term, remarks, status, submitted_at, created_at, updated_at,
    credit_limit_at_submission, used_credit_at_submission,
    available_credit_at_submission
  into v_application;

  return jsonb_build_object(
    'ok', true,
    'message', 'Application submitted.',
    'application', to_jsonb(v_application),
    'credit_limit', v_credit_limit,
    'used_credit', v_used_credit,
    'available_credit', v_available_credit
  );
exception
  when check_violation then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_application',
      'message', 'Review the highlighted fields before submitting.'
    );
  when not_null_violation then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_application',
      'message', 'Review the highlighted fields before submitting.'
    );
  when raise_exception then
    if sqlerrm = 'Requested amount exceeds your available credit.' then
      return jsonb_build_object(
        'ok', false,
        'code', 'credit_limit_exceeded',
        'message', 'Requested amount exceeds your available credit.'
      );
    end if;

    return jsonb_build_object(
      'ok', false,
      'code', 'missing_portfolio',
      'message', 'Save your business profile before submitting an application.'
    );
end;
$$;

drop policy if exists "loan_applications_insert_own_borrower" on public.loan_applications;
create policy "loan_applications_insert_own_borrower"
  on public.loan_applications for insert
  to authenticated
  with check (
    (select auth.uid()) = borrower_id
    and app_private.is_verified_borrower((select auth.uid()))
    and status = 'submitted'
    and app_private.borrower_owns_portfolio(
      borrower_portfolio_id,
      (select auth.uid())
    )
  );

grant execute on function app_private.is_verified_borrower(uuid) to authenticated;
grant execute on function app_private.review_borrower_verification(uuid, text, text, text)
  to authenticated;
grant execute on function public.review_borrower_verification(uuid, text, text, text)
  to authenticated;
grant execute on function app_private.submit_loan_application(
  numeric,
  text,
  public.preferred_term,
  text
) to authenticated;
grant execute on function public.submit_loan_application(
  numeric,
  text,
  public.preferred_term,
  text
) to authenticated;
