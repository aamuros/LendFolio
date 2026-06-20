create or replace function app_private.record_signup_baseline_consents(
  p_user_id uuid,
  p_user_metadata jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_terms_accepted boolean :=
    lower(coalesce(p_user_metadata ->> 'signup_terms_accepted', '')) in ('true', 't', '1', 'yes', 'on');
  v_privacy_accepted boolean :=
    lower(coalesce(p_user_metadata ->> 'signup_privacy_accepted', '')) in ('true', 't', '1', 'yes', 'on');
  v_terms_version text := nullif(btrim(coalesce(p_user_metadata ->> 'signup_terms_version', '')), '');
  v_privacy_version text := nullif(btrim(coalesce(p_user_metadata ->> 'signup_privacy_version', '')), '');
  v_ip_address inet;
  v_user_agent text := nullif(left(coalesce(p_user_metadata ->> 'signup_consent_user_agent', ''), 500), '');
  v_accepted_count integer := 0;
  v_consent_types text[] := array[]::text[];
begin
  if p_user_id is null
    or p_user_metadata is null
    or not v_terms_accepted
    or not v_privacy_accepted
    or v_terms_version is null
    or v_privacy_version is null
  then
    return 0;
  end if;

  begin
    v_ip_address := nullif(btrim(coalesce(p_user_metadata ->> 'signup_consent_ip_address', '')), '')::inet;
  exception
    when invalid_text_representation then
      v_ip_address := null;
  end;

  if not exists (
    select 1
    from public.legal_documents
    where consent_type = 'terms_of_service'
      and version = v_terms_version
      and retired_at is null
  ) or not exists (
    select 1
    from public.legal_documents
    where consent_type = 'privacy_notice'
      and version = v_privacy_version
      and retired_at is null
  ) then
    return 0;
  end if;

  with requested(consent_type, version) as (
    values
      ('terms_of_service'::public.user_consent_type, v_terms_version),
      ('privacy_notice'::public.user_consent_type, v_privacy_version)
  ),
  inserted as (
    insert into public.user_consents (
      user_id,
      consent_type,
      version,
      ip_address,
      user_agent
    )
    select
      p_user_id,
      requested.consent_type,
      requested.version,
      v_ip_address,
      v_user_agent
    from requested
    on conflict (user_id, consent_type, version) do nothing
    returning consent_type
  )
  select
    count(*),
    coalesce(array_agg(consent_type::text order by consent_type::text), array[]::text[])
  into v_accepted_count, v_consent_types
  from inserted;

  if v_accepted_count > 0 then
    perform app_private.write_audit_log(
      'user_consents_accepted',
      'user_consents',
      p_user_id,
      jsonb_build_object(
        'accepted_count', v_accepted_count,
        'consent_types', to_jsonb(v_consent_types),
        'source', 'signup_provisioning'
      )
    );
  end if;

  return v_accepted_count;
end;
$$;

create or replace function app_private.record_profile_signup_baseline_consents()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_metadata jsonb := '{}'::jsonb;
begin
  select raw_user_meta_data
  into v_user_metadata
  from auth.users
  where id = new.id;

  perform app_private.record_signup_baseline_consents(
    new.id,
    coalesce(v_user_metadata, '{}'::jsonb)
  );

  return new;
end;
$$;

drop trigger if exists profiles_record_signup_baseline_consents on public.profiles;
create trigger profiles_record_signup_baseline_consents
  after insert on public.profiles
  for each row execute function app_private.record_profile_signup_baseline_consents();

grant execute on function app_private.record_signup_baseline_consents(uuid, jsonb)
  to supabase_auth_admin;
grant execute on function app_private.record_profile_signup_baseline_consents()
  to supabase_auth_admin;
