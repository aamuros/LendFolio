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

  if v_role = 'lender' then
    if v_organization_name is null
      or char_length(v_organization_name) not between 2 and 160 then
      raise exception 'A valid organization name is required.'
        using errcode = '23514';
    end if;

    insert into public.lender_profiles (
      user_id,
      organization_name,
      verification_status,
      approved_at,
      approved_by
    )
    values (
      new.id,
      v_organization_name,
      'pending',
      null,
      null
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_provision_lendfolio on auth.users;
create trigger on_auth_user_created_provision_lendfolio
  after insert on auth.users
  for each row execute function app_private.provision_new_auth_user();

drop policy if exists "profiles_insert_own_borrower" on public.profiles;
drop policy if exists "lender_profiles_manager_write" on public.lender_profiles;

revoke insert, update, delete on public.profiles from authenticated;
revoke insert, update, delete on public.lender_profiles from authenticated;

create or replace function app_private.review_lender_verification(
  p_lender_profile_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_lender_profile public.lender_profiles%rowtype;
  v_action text;
begin
  if not app_private.is_manager(v_actor_id) then
    return jsonb_build_object(
      'ok', false,
      'message', 'Only managers can review lenders.'
    );
  end if;

  if p_decision not in ('approve', 'reject') then
    return jsonb_build_object(
      'ok', false,
      'message', 'Choose approve or reject.'
    );
  end if;

  select *
  into v_lender_profile
  from public.lender_profiles
  where id = p_lender_profile_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'Lender profile was not found.'
    );
  end if;

  if v_lender_profile.user_id = v_actor_id then
    return jsonb_build_object(
      'ok', false,
      'message', 'Managers cannot review their own lender profile.'
    );
  end if;

  if p_decision = 'approve' then
    update public.lender_profiles
    set
      verification_status = 'approved',
      approved_at = now(),
      approved_by = v_actor_id,
      updated_at = now()
    where id = p_lender_profile_id
    returning * into v_lender_profile;

    v_action := 'lender_approved';
  else
    update public.lender_profiles
    set
      verification_status = 'rejected',
      approved_at = null,
      approved_by = null,
      updated_at = now()
    where id = p_lender_profile_id
    returning * into v_lender_profile;

    v_action := 'lender_rejected';
  end if;

  perform app_private.write_audit_log(
    v_action,
    'lender_profiles',
    v_lender_profile.id,
    jsonb_build_object(
      'user_id', v_lender_profile.user_id,
      'organization_name', v_lender_profile.organization_name,
      'verification_status', v_lender_profile.verification_status
    )
  );

  return jsonb_build_object(
    'ok', true,
    'message', case
      when p_decision = 'approve' then 'Lender approved.'
      else 'Lender rejected.'
    end,
    'lender_profile_id', v_lender_profile.id,
    'verification_status', v_lender_profile.verification_status
  );
end;
$$;

create or replace function public.review_lender_verification(
  p_lender_profile_id uuid,
  p_decision text
)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.review_lender_verification(
    p_lender_profile_id,
    p_decision
  );
$$;

grant execute on function app_private.provision_new_auth_user()
  to supabase_auth_admin;
grant execute on function app_private.review_lender_verification(uuid, text)
  to authenticated;
grant execute on function public.review_lender_verification(uuid, text)
  to authenticated;
