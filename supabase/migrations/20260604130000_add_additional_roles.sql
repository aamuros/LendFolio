alter table public.profiles
  add column if not exists additional_roles public.app_role[] not null default '{}';

create or replace function app_private.has_role(p_user_id uuid, p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = p_user_id
      and status = 'active'
      and (role = p_role or p_role = any(additional_roles))
  );
$$;

create or replace function app_private.is_approved_lender(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    join public.lender_profiles on lender_profiles.user_id = profiles.id
    where profiles.id = p_user_id
      and profiles.status = 'active'
      and (profiles.role = 'lender' or 'lender' = any(profiles.additional_roles))
      and lender_profiles.verification_status = 'approved'
  );
$$;
