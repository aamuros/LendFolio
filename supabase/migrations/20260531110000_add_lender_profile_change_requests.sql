do $$
begin
  if not exists (select 1 from pg_type where typname = 'lender_profile_change_request_status') then
    create type public.lender_profile_change_request_status as enum (
      'pending',
      'approved',
      'rejected',
      'cancelled'
    );
  end if;
end
$$;

create table if not exists public.lender_profile_change_requests (
  id uuid primary key default gen_random_uuid(),
  lender_id uuid not null references public.profiles (id) on delete cascade,
  lender_profile_id uuid not null references public.lender_profiles (id) on delete cascade,
  proposed_organization_name text,
  proposed_business_registration_number text,
  proposed_business_address text,
  proposed_operating_area text,
  proposed_min_loan_amount numeric(12, 2),
  proposed_max_loan_amount numeric(12, 2),
  proposed_typical_repayment_terms text,
  proposed_lender_description text,
  proposed_contact_person text,
  proposed_values jsonb,
  status public.lender_profile_change_request_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id),
  manager_review_notes text,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lender_profile_change_requests_proposed_org_length
    check (
      proposed_organization_name is null
      or char_length(proposed_organization_name) between 2 and 160
    ),
  constraint lender_profile_change_requests_proposed_reg_length
    check (
      proposed_business_registration_number is null
      or char_length(proposed_business_registration_number) between 2 and 80
    ),
  constraint lender_profile_change_requests_proposed_address_length
    check (
      proposed_business_address is null
      or char_length(proposed_business_address) between 5 and 240
    ),
  constraint lender_profile_change_requests_proposed_area_length
    check (
      proposed_operating_area is null
      or char_length(proposed_operating_area) between 2 and 160
    ),
  constraint lender_profile_change_requests_proposed_amounts_valid
    check (
      (proposed_min_loan_amount is null and proposed_max_loan_amount is null)
      or (
        proposed_min_loan_amount > 0
        and proposed_max_loan_amount > 0
        and proposed_max_loan_amount >= proposed_min_loan_amount
      )
    ),
  constraint lender_profile_change_requests_proposed_terms_length
    check (
      proposed_typical_repayment_terms is null
      or char_length(proposed_typical_repayment_terms) between 2 and 240
    ),
  constraint lender_profile_change_requests_proposed_desc_length
    check (
      proposed_lender_description is null
      or char_length(proposed_lender_description) between 20 and 800
    ),
  constraint lender_profile_change_requests_proposed_contact_length
    check (
      proposed_contact_person is null
      or char_length(proposed_contact_person) between 2 and 120
    ),
  constraint lender_profile_change_requests_notes_length
    check (
      manager_review_notes is null
      or char_length(manager_review_notes) <= 1000
    ),
  constraint lender_profile_change_requests_rejection_length
    check (
      rejection_reason is null
      or char_length(rejection_reason) <= 1000
    ),
  constraint lender_profile_change_requests_review_state_valid
    check (
      (
        status = 'approved'
        and reviewed_at is not null
        and reviewed_by is not null
        and rejection_reason is null
      )
      or (
        status = 'rejected'
        and reviewed_at is not null
        and reviewed_by is not null
        and nullif(btrim(coalesce(rejection_reason, '')), '') is not null
      )
      or (
        status = 'pending'
        and reviewed_at is null
        and reviewed_by is null
        and rejection_reason is null
      )
      or (
        status = 'cancelled'
      )
    )
);

create index if not exists lender_profile_change_requests_lender_status_idx
  on public.lender_profile_change_requests (lender_id, status, submitted_at desc);

create index if not exists lender_profile_change_requests_status_submitted_idx
  on public.lender_profile_change_requests (status, submitted_at desc);

alter table public.lender_profile_change_requests enable row level security;

drop policy if exists "lender_profile_change_requests_lender_select_own"
  on public.lender_profile_change_requests;
drop policy if exists "lender_profile_change_requests_manager_select_all"
  on public.lender_profile_change_requests;

create policy "lender_profile_change_requests_lender_select_own"
  on public.lender_profile_change_requests for select
  to authenticated
  using ((select auth.uid()) = lender_id);

create policy "lender_profile_change_requests_manager_select_all"
  on public.lender_profile_change_requests for select
  to authenticated
  using (app_private.is_manager((select auth.uid())));

grant select on public.lender_profile_change_requests to authenticated;
revoke insert, update, delete on public.lender_profile_change_requests from anon;
revoke insert, update, delete on public.lender_profile_change_requests from authenticated;

drop trigger if exists lender_profile_change_requests_set_updated_at
  on public.lender_profile_change_requests;
create trigger lender_profile_change_requests_set_updated_at
  before update on public.lender_profile_change_requests
  for each row execute function app_private.set_updated_at();

create or replace function app_private.submit_lender_profile_change_request(
  p_lender_profile_id uuid,
  p_proposed_organization_name text,
  p_proposed_contact_person text,
  p_proposed_business_address text,
  p_proposed_operating_area text,
  p_proposed_business_registration_number text,
  p_proposed_min_loan_amount numeric,
  p_proposed_max_loan_amount numeric,
  p_proposed_typical_repayment_terms text,
  p_proposed_lender_description text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_profile public.lender_profiles%rowtype;
  v_request_id uuid;
  v_existing_pending int;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  select *
  into v_profile
  from public.lender_profiles
  where id = p_lender_profile_id
    and user_id = v_actor_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'Lender profile was not found.'
    );
  end if;

  if v_profile.verification_status <> 'approved' then
    return jsonb_build_object(
      'ok', false,
      'message', 'Only approved lenders can submit profile change requests.'
    );
  end if;

  select count(*)
  into v_existing_pending
  from public.lender_profile_change_requests
  where lender_id = v_actor_id
    and lender_profile_id = p_lender_profile_id
    and status = 'pending';

  if v_existing_pending > 0 then
    return jsonb_build_object(
      'ok', false,
      'message', 'You already have a pending profile change request. Wait for manager review or cancel it before submitting a new one.'
    );
  end if;

  if p_proposed_organization_name is not null
    and char_length(p_proposed_organization_name) not between 2 and 160 then
    return jsonb_build_object('ok', false, 'message', 'Organization name must be between 2 and 160 characters.');
  end if;

  if p_proposed_contact_person is not null
    and char_length(p_proposed_contact_person) not between 2 and 120 then
    return jsonb_build_object('ok', false, 'message', 'Contact person must be between 2 and 120 characters.');
  end if;

  if p_proposed_business_address is not null
    and char_length(p_proposed_business_address) not between 5 and 240 then
    return jsonb_build_object('ok', false, 'message', 'Business address must be between 5 and 240 characters.');
  end if;

  if p_proposed_operating_area is not null
    and char_length(p_proposed_operating_area) not between 2 and 160 then
    return jsonb_build_object('ok', false, 'message', 'Operating area must be between 2 and 160 characters.');
  end if;

  if p_proposed_business_registration_number is not null
    and char_length(p_proposed_business_registration_number) not between 2 and 80 then
    return jsonb_build_object('ok', false, 'message', 'Business registration number must be between 2 and 80 characters.');
  end if;

  if p_proposed_min_loan_amount is not null and p_proposed_min_loan_amount <= 0 then
    return jsonb_build_object('ok', false, 'message', 'Minimum loan amount must be greater than zero.');
  end if;

  if p_proposed_max_loan_amount is not null and p_proposed_max_loan_amount <= 0 then
    return jsonb_build_object('ok', false, 'message', 'Maximum loan amount must be greater than zero.');
  end if;

  if p_proposed_min_loan_amount is not null
    and p_proposed_max_loan_amount is not null
    and p_proposed_max_loan_amount < p_proposed_min_loan_amount then
    return jsonb_build_object('ok', false, 'message', 'Maximum loan amount must be at least the minimum.');
  end if;

  if p_proposed_typical_repayment_terms is not null
    and char_length(p_proposed_typical_repayment_terms) not between 2 and 240 then
    return jsonb_build_object('ok', false, 'message', 'Repayment terms must be between 2 and 240 characters.');
  end if;

  if p_proposed_lender_description is not null
    and char_length(p_proposed_lender_description) not between 20 and 800 then
    return jsonb_build_object('ok', false, 'message', 'Lender description must be between 20 and 800 characters.');
  end if;

  insert into public.lender_profile_change_requests (
    lender_id,
    lender_profile_id,
    proposed_organization_name,
    proposed_contact_person,
    proposed_business_address,
    proposed_operating_area,
    proposed_business_registration_number,
    proposed_min_loan_amount,
    proposed_max_loan_amount,
    proposed_typical_repayment_terms,
    proposed_lender_description,
    proposed_values,
    status
  )
  values (
    v_actor_id,
    p_lender_profile_id,
    nullif(btrim(coalesce(p_proposed_organization_name, '')), ''),
    nullif(btrim(coalesce(p_proposed_contact_person, '')), ''),
    nullif(btrim(coalesce(p_proposed_business_address, '')), ''),
    nullif(btrim(coalesce(p_proposed_operating_area, '')), ''),
    nullif(btrim(coalesce(p_proposed_business_registration_number, '')), ''),
    p_proposed_min_loan_amount,
    p_proposed_max_loan_amount,
    nullif(btrim(coalesce(p_proposed_typical_repayment_terms, '')), ''),
    nullif(btrim(coalesce(p_proposed_lender_description, '')), ''),
    jsonb_strip_nulls(jsonb_build_object(
      'organization_name', nullif(btrim(coalesce(p_proposed_organization_name, '')), ''),
      'contact_person', nullif(btrim(coalesce(p_proposed_contact_person, '')), ''),
      'business_address', nullif(btrim(coalesce(p_proposed_business_address, '')), ''),
      'operating_area', nullif(btrim(coalesce(p_proposed_operating_area, '')), ''),
      'business_registration_number', nullif(btrim(coalesce(p_proposed_business_registration_number, '')), ''),
      'min_loan_amount', p_proposed_min_loan_amount,
      'max_loan_amount', p_proposed_max_loan_amount,
      'typical_repayment_terms', nullif(btrim(coalesce(p_proposed_typical_repayment_terms, '')), ''),
      'lender_description', nullif(btrim(coalesce(p_proposed_lender_description, '')), '')
    )),
    'pending'
  )
  returning id into v_request_id;

  perform app_private.write_audit_log(
    'lender_profile_change_request_submitted',
    'lender_profile_change_requests',
    v_request_id,
    jsonb_build_object(
      'lender_id', v_actor_id,
      'lender_profile_id', p_lender_profile_id
    )
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Profile change request submitted.',
    'request_id', v_request_id
  );
exception
  when check_violation then
    return jsonb_build_object(
      'ok', false,
      'message', 'Review the request details before submitting.'
    );
end;
$$;

create or replace function public.submit_lender_profile_change_request(
  p_lender_profile_id uuid,
  p_proposed_organization_name text,
  p_proposed_contact_person text,
  p_proposed_business_address text,
  p_proposed_operating_area text,
  p_proposed_business_registration_number text,
  p_proposed_min_loan_amount numeric,
  p_proposed_max_loan_amount numeric,
  p_proposed_typical_repayment_terms text,
  p_proposed_lender_description text
)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.submit_lender_profile_change_request(
    p_lender_profile_id,
    p_proposed_organization_name,
    p_proposed_contact_person,
    p_proposed_business_address,
    p_proposed_operating_area,
    p_proposed_business_registration_number,
    p_proposed_min_loan_amount,
    p_proposed_max_loan_amount,
    p_proposed_typical_repayment_terms,
    p_proposed_lender_description
  );
$$;

create or replace function app_private.cancel_lender_profile_change_request(
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_request public.lender_profile_change_requests%rowtype;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  select *
  into v_request
  from public.lender_profile_change_requests
  where id = p_request_id
    and lender_id = v_actor_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Change request was not found.');
  end if;

  if v_request.status <> 'pending' then
    return jsonb_build_object('ok', false, 'message', 'Only pending requests can be cancelled.');
  end if;

  update public.lender_profile_change_requests
  set status = 'cancelled', updated_at = now()
  where id = p_request_id;

  perform app_private.write_audit_log(
    'lender_profile_change_request_cancelled',
    'lender_profile_change_requests',
    p_request_id,
    jsonb_build_object('lender_id', v_actor_id)
  );

  return jsonb_build_object('ok', true, 'message', 'Change request cancelled.');
end;
$$;

create or replace function public.cancel_lender_profile_change_request(
  p_request_id uuid
)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.cancel_lender_profile_change_request(p_request_id);
$$;

create or replace function app_private.review_lender_profile_change_request(
  p_request_id uuid,
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
  v_request public.lender_profile_change_requests%rowtype;
  v_notes text := nullif(btrim(coalesce(p_manager_review_notes, '')), '');
  v_rejection_reason text := nullif(btrim(coalesce(p_rejection_reason, '')), '');
  v_action text;
  v_profile public.lender_profiles%rowtype;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_manager(v_actor_id) then
    return jsonb_build_object('ok', false, 'message', 'Only managers can review change requests.');
  end if;

  if p_decision not in ('approve', 'reject') then
    return jsonb_build_object('ok', false, 'message', 'Choose approve or reject.');
  end if;

  if p_decision = 'reject' and v_rejection_reason is null then
    return jsonb_build_object('ok', false, 'message', 'Rejection reason is required.');
  end if;

  if v_notes is not null and char_length(v_notes) > 1000 then
    return jsonb_build_object('ok', false, 'message', 'Review notes must be 1000 characters or fewer.');
  end if;

  if v_rejection_reason is not null and char_length(v_rejection_reason) > 1000 then
    return jsonb_build_object('ok', false, 'message', 'Rejection reason must be 1000 characters or fewer.');
  end if;

  select *
  into v_request
  from public.lender_profile_change_requests
  where id = p_request_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Change request was not found.');
  end if;

  if v_request.status <> 'pending' then
    return jsonb_build_object('ok', false, 'message', 'Only pending requests can be reviewed.');
  end if;

  if v_request.lender_id = v_actor_id then
    return jsonb_build_object('ok', false, 'message', 'Managers cannot review their own change requests.');
  end if;

  if p_decision = 'approve' then
    update public.lender_profile_change_requests
    set
      status = 'approved',
      reviewed_at = now(),
      reviewed_by = v_actor_id,
      manager_review_notes = v_notes,
      rejection_reason = null,
      updated_at = now()
    where id = p_request_id
    returning * into v_request;

    select *
    into v_profile
    from public.lender_profiles
    where id = v_request.lender_profile_id
    for update;

    update public.lender_profiles
    set
      organization_name = coalesce(v_request.proposed_organization_name, v_profile.organization_name),
      contact_person = coalesce(v_request.proposed_contact_person, v_profile.contact_person),
      business_address = coalesce(v_request.proposed_business_address, v_profile.business_address),
      operating_area = coalesce(v_request.proposed_operating_area, v_profile.operating_area),
      business_registration_number = coalesce(v_request.proposed_business_registration_number, v_profile.business_registration_number),
      min_loan_amount = coalesce(v_request.proposed_min_loan_amount, v_profile.min_loan_amount),
      max_loan_amount = coalesce(v_request.proposed_max_loan_amount, v_profile.max_loan_amount),
      typical_repayment_terms = coalesce(v_request.proposed_typical_repayment_terms, v_profile.typical_repayment_terms),
      lender_description = coalesce(v_request.proposed_lender_description, v_profile.lender_description),
      manager_review_notes = v_notes,
      updated_at = now()
    where id = v_request.lender_profile_id;

    v_action := 'lender_profile_change_request_approved';
  else
    update public.lender_profile_change_requests
    set
      status = 'rejected',
      reviewed_at = now(),
      reviewed_by = v_actor_id,
      manager_review_notes = v_notes,
      rejection_reason = v_rejection_reason,
      updated_at = now()
    where id = p_request_id
    returning * into v_request;

    v_action := 'lender_profile_change_request_rejected';
  end if;

  perform app_private.write_audit_log(
    v_action,
    'lender_profile_change_requests',
    v_request.id,
    jsonb_build_object(
      'lender_id', v_request.lender_id,
      'lender_profile_id', v_request.lender_profile_id,
      'decision', p_decision,
      'manager_review_notes_present', v_notes is not null,
      'rejection_reason_present', v_rejection_reason is not null
    )
  );

  perform app_private.try_create_notification(
    v_request.lender_id,
    case when p_decision = 'approve' then 'lender_profile_change_approved' else 'lender_profile_change_rejected' end,
    case when p_decision = 'approve' then 'Profile change approved' else 'Profile change rejected' end,
    case when p_decision = 'approve' then 'Your lender profile change request has been approved.' else 'Your lender profile change request was rejected. Review the feedback and resubmit if needed.' end,
    '/lender'
  );

  return jsonb_build_object(
    'ok', true,
    'message', case
      when p_decision = 'approve' then 'Profile change request approved and applied.'
      else 'Profile change request rejected.'
    end,
    'request_id', v_request.id,
    'status', v_request.status
  );
end;
$$;

create or replace function public.review_lender_profile_change_request(
  p_request_id uuid,
  p_decision text,
  p_manager_review_notes text default null,
  p_rejection_reason text default null
)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.review_lender_profile_change_request(
    p_request_id,
    p_decision,
    p_manager_review_notes,
    p_rejection_reason
  );
$$;

grant execute on function app_private.submit_lender_profile_change_request(
  uuid, text, text, text, text, text, numeric, numeric, text, text
) to authenticated;
grant execute on function public.submit_lender_profile_change_request(
  uuid, text, text, text, text, text, numeric, numeric, text, text
) to authenticated;
grant execute on function app_private.cancel_lender_profile_change_request(uuid)
  to authenticated;
grant execute on function public.cancel_lender_profile_change_request(uuid)
  to authenticated;
grant execute on function app_private.review_lender_profile_change_request(uuid, text, text, text)
  to authenticated;
grant execute on function public.review_lender_profile_change_request(uuid, text, text, text)
  to authenticated;
