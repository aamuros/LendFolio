do $$
begin
  if not exists (select 1 from pg_type where typname = 'provisioning_event_status') then
    create type public.provisioning_event_status as enum (
      'attempted',
      'succeeded',
      'failed'
    );
  end if;
end
$$;

create table if not exists public.provisioning_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_status public.provisioning_event_status not null,
  requested_role text,
  source text not null check (char_length(source) between 2 and 80),
  message text not null check (char_length(message) between 2 and 500),
  metadata jsonb not null default '{}'::jsonb,
  actor_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists provisioning_events_user_created_idx
  on public.provisioning_events (user_id, created_at desc);

create index if not exists provisioning_events_status_created_idx
  on public.provisioning_events (event_status, created_at desc);

alter table public.provisioning_events enable row level security;

drop policy if exists "provisioning_events_manager_select" on public.provisioning_events;

create policy "provisioning_events_manager_select"
  on public.provisioning_events for select
  to authenticated
  using (app_private.is_manager((select auth.uid())));

revoke insert, update, delete on public.provisioning_events from anon;
revoke insert, update, delete on public.provisioning_events from authenticated;
grant select on public.provisioning_events to authenticated;

create or replace function app_private.write_provisioning_event(
  p_user_id uuid,
  p_event_status public.provisioning_event_status,
  p_requested_role text,
  p_source text,
  p_message text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.provisioning_events (
    user_id,
    event_status,
    requested_role,
    source,
    message,
    metadata,
    actor_id
  )
  values (
    p_user_id,
    p_event_status,
    p_requested_role,
    p_source,
    left(p_message, 500),
    coalesce(p_metadata, '{}'::jsonb),
    auth.uid()
  );
end;
$$;

create or replace function app_private.provision_auth_user(
  p_user auth.users,
  p_source text default 'auth_user_created'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text := nullif(btrim(coalesce(p_user.raw_user_meta_data ->> 'lendfolio_role', '')), '');
  v_display_name text := nullif(btrim(coalesce(p_user.raw_user_meta_data ->> 'display_name', '')), '');
  v_organization_name text := nullif(btrim(coalesce(p_user.raw_user_meta_data ->> 'organization_name', '')), '');
  v_contact_person text := nullif(btrim(coalesce(p_user.raw_user_meta_data ->> 'contact_person', '')), '');
  v_phone_number text := nullif(btrim(coalesce(p_user.raw_user_meta_data ->> 'phone_number', '')), '');
  v_business_address text := nullif(btrim(coalesce(p_user.raw_user_meta_data ->> 'business_address', '')), '');
  v_operating_area text := nullif(btrim(coalesce(p_user.raw_user_meta_data ->> 'operating_area', '')), '');
  v_business_registration_number text := nullif(btrim(coalesce(p_user.raw_user_meta_data ->> 'business_registration_number', '')), '');
  v_min_loan_amount numeric(12, 2);
  v_max_loan_amount numeric(12, 2);
  v_typical_repayment_terms text := nullif(btrim(coalesce(p_user.raw_user_meta_data ->> 'typical_repayment_terms', '')), '');
  v_lender_description text := nullif(btrim(coalesce(p_user.raw_user_meta_data ->> 'lender_description', '')), '');
  v_existing_role public.app_role;
  v_message text;
begin
  if not (p_user.raw_user_meta_data ? 'lendfolio_role') then
    return jsonb_build_object(
      'ok', true,
      'message', 'No self-service provisioning metadata found.'
    );
  end if;

  perform app_private.write_provisioning_event(
    p_user.id,
    'attempted',
    v_role,
    p_source,
    'Account provisioning started.',
    jsonb_build_object('email', p_user.email)
  );

  if v_role is null then
    v_message := 'Signup role is required.';
    perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
    return jsonb_build_object('ok', false, 'message', v_message);
  end if;

  if v_role not in ('borrower', 'lender') then
    v_message := 'Unsupported signup role.';
    perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
    return jsonb_build_object('ok', false, 'message', v_message);
  end if;

  if v_display_name is null or char_length(v_display_name) not between 2 and 120 then
    v_message := 'A valid display name is required.';
    perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
    return jsonb_build_object('ok', false, 'message', v_message);
  end if;

  select role
  into v_existing_role
  from public.profiles
  where id = p_user.id;

  if found and v_existing_role::text <> v_role then
    v_message := 'Existing profile role does not match signup metadata.';
    perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
    return jsonb_build_object('ok', false, 'message', v_message);
  end if;

  if v_role = 'lender' then
    if v_organization_name is null
      or char_length(v_organization_name) not between 2 and 160 then
      v_message := 'A valid organization name is required.';
      perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
      return jsonb_build_object('ok', false, 'message', v_message);
    end if;

    if v_contact_person is null or char_length(v_contact_person) not between 2 and 120 then
      v_message := 'A valid contact person is required.';
      perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
      return jsonb_build_object('ok', false, 'message', v_message);
    end if;

    if v_phone_number is null or char_length(v_phone_number) not between 7 and 30 then
      v_message := 'A valid phone number is required.';
      perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
      return jsonb_build_object('ok', false, 'message', v_message);
    end if;

    if v_business_address is null or char_length(v_business_address) not between 5 and 240 then
      v_message := 'A valid business address is required.';
      perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
      return jsonb_build_object('ok', false, 'message', v_message);
    end if;

    if v_operating_area is null or char_length(v_operating_area) not between 2 and 160 then
      v_message := 'A valid operating area is required.';
      perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
      return jsonb_build_object('ok', false, 'message', v_message);
    end if;

    if v_business_registration_number is not null
      and char_length(v_business_registration_number) not between 2 and 80 then
      v_message := 'A valid business registration number is required.';
      perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
      return jsonb_build_object('ok', false, 'message', v_message);
    end if;

    begin
      v_min_loan_amount := (p_user.raw_user_meta_data ->> 'min_loan_amount')::numeric(12, 2);
      v_max_loan_amount := (p_user.raw_user_meta_data ->> 'max_loan_amount')::numeric(12, 2);
    exception
      when invalid_text_representation or numeric_value_out_of_range then
        v_message := 'Valid loan amount limits are required.';
        perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
        return jsonb_build_object('ok', false, 'message', v_message);
    end;

    if v_min_loan_amount is null
      or v_max_loan_amount is null
      or v_min_loan_amount <= 0
      or v_max_loan_amount <= 0
      or v_max_loan_amount < v_min_loan_amount then
      v_message := 'Valid loan amount limits are required.';
      perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
      return jsonb_build_object('ok', false, 'message', v_message);
    end if;

    if v_typical_repayment_terms is null
      or char_length(v_typical_repayment_terms) not between 2 and 240 then
      v_message := 'Valid repayment terms are required.';
      perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
      return jsonb_build_object('ok', false, 'message', v_message);
    end if;

    if v_lender_description is null
      or char_length(v_lender_description) not between 20 and 800 then
      v_message := 'A valid lender description is required.';
      perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
      return jsonb_build_object('ok', false, 'message', v_message);
    end if;
  end if;

  insert into public.profiles (
    id,
    role,
    display_name,
    status
  )
  values (
    p_user.id,
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
      p_user.id,
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
      p_user.id,
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

  perform app_private.write_provisioning_event(
    p_user.id,
    'succeeded',
    v_role,
    p_source,
    'Account provisioning completed.'
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Account provisioning completed.',
    'user_id', p_user.id,
    'role', v_role
  );
exception
  when others then
    v_message := 'Account provisioning failed.';
    perform app_private.write_provisioning_event(
      p_user.id,
      'failed',
      v_role,
      p_source,
      v_message,
      jsonb_build_object('sqlstate', sqlstate, 'detail', sqlerrm)
    );
    return jsonb_build_object('ok', false, 'message', v_message);
end;
$$;

create or replace function app_private.provision_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform app_private.provision_auth_user(new, 'auth_user_created');
  return new;
end;
$$;

create or replace function app_private.repair_user_provisioning(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_auth_role text := auth.role();
  v_user auth.users%rowtype;
begin
  if v_auth_role <> 'service_role'
    and (v_actor_id is null or not app_private.is_manager(v_actor_id)) then
    return jsonb_build_object(
      'ok', false,
      'message', 'Only managers can repair account provisioning.'
    );
  end if;

  select *
  into v_user
  from auth.users
  where id = p_user_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'Auth user was not found.'
    );
  end if;

  return app_private.provision_auth_user(v_user, 'repair_user_provisioning');
end;
$$;

create or replace function public.repair_user_provisioning(p_user_id uuid)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.repair_user_provisioning(p_user_id);
$$;

drop view if exists public.account_onboarding_states;
create view public.account_onboarding_states
with (security_invoker = true)
as
select
  profiles.id as user_id,
  profiles.role,
  profiles.status as profile_status,
  borrower_verifications.verification_status as borrower_verification_status,
  lender_profiles.verification_status as lender_verification_status,
  case
    when profiles.role = 'borrower'
      and borrower_verifications.id is not null then 'ready_for_review'
    when profiles.role = 'lender'
      and lender_profiles.id is not null then 'ready_for_review'
    else 'incomplete'
  end as provisioning_state,
  case
    when profiles.role = 'borrower'
      and borrower_verifications.verification_status = 'approved' then 'ready'
    when profiles.role = 'borrower'
      and borrower_verifications.verification_status = 'rejected' then 'borrower_review_rejected'
    when profiles.role = 'borrower' then 'borrower_review_pending'
    when profiles.role = 'lender'
      and lender_profiles.verification_status = 'approved' then 'ready'
    when profiles.role = 'lender'
      and lender_profiles.verification_status = 'rejected' then 'lender_review_rejected'
    when profiles.role = 'lender' then 'lender_review_pending'
    else 'not_applicable'
  end as onboarding_state,
  profiles.created_at,
  profiles.updated_at
from public.profiles
left join public.borrower_verifications
  on borrower_verifications.borrower_id = profiles.id
left join public.lender_profiles
  on lender_profiles.user_id = profiles.id
where profiles.role in ('borrower', 'lender');

grant select on public.account_onboarding_states to authenticated;
grant execute on function app_private.write_provisioning_event(
  uuid,
  public.provisioning_event_status,
  text,
  text,
  text,
  jsonb
) to supabase_auth_admin;
grant execute on function app_private.provision_auth_user(auth.users, text)
  to supabase_auth_admin;
grant execute on function app_private.provision_new_auth_user()
  to supabase_auth_admin;
grant execute on function app_private.repair_user_provisioning(uuid)
  to authenticated;
grant execute on function public.repair_user_provisioning(uuid)
  to authenticated;
