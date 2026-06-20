alter type public.lender_verification_status add value if not exists 'incomplete';

alter table public.lender_profiles
  alter column organization_name drop not null,
  alter column contact_person drop not null,
  alter column phone_number drop not null,
  alter column business_address drop not null,
  alter column operating_area drop not null,
  alter column min_loan_amount drop not null,
  alter column max_loan_amount drop not null,
  alter column typical_repayment_terms drop not null,
  alter column lender_description drop not null;

alter table public.lender_profiles
  drop constraint if exists lender_profiles_review_state_valid;

alter table public.lender_profiles
  add constraint lender_profiles_review_state_valid
    check (
      (
        verification_status = 'approved'
        and approved_at is not null
        and approved_by is not null
        and rejected_at is null
        and rejected_by is null
        and rejection_reason is null
      )
      or (
        verification_status = 'rejected'
        and rejected_at is not null
        and rejected_by is not null
        and nullif(btrim(coalesce(rejection_reason, '')), '') is not null
        and approved_at is null
        and approved_by is null
      )
      or (
        verification_status = 'pending'
        and approved_at is null
        and approved_by is null
        and rejected_at is null
        and rejected_by is null
      )
      or (
        verification_status::text = 'incomplete'
        and approved_at is null
        and approved_by is null
        and rejected_at is null
        and rejected_by is null
      )
    );

create or replace function app_private.provision_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
  v_message text;
begin
  v_result := app_private.provision_auth_user(new, 'auth_user_created');

  if coalesce((v_result ->> 'ok')::boolean, false) is not true then
    v_message := coalesce(v_result ->> 'message', 'Account provisioning failed.');
    raise exception using
      errcode = 'P0001',
      message = v_message,
      detail = left(coalesce(v_result::text, '{}'::text), 500);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_provision_lendfolio on auth.users;
create trigger on_auth_user_created_provision_lendfolio
  after insert on auth.users
  for each row execute function app_private.provision_new_auth_user();

do $$
declare
  v_user auth.users%rowtype;
  v_result jsonb;
  v_role text;
begin
  for v_user in
    select auth_users.*
    from auth.users auth_users
    left join public.profiles profiles
      on profiles.id = auth_users.id
    where profiles.id is null
      and auth_users.raw_user_meta_data ? 'lendfolio_role'
    order by auth_users.created_at
  loop
    v_role := nullif(btrim(coalesce(v_user.raw_user_meta_data ->> 'lendfolio_role', '')), '');

    begin
      v_result := app_private.provision_auth_user(v_user, 'repair_orphaned_signup');

      if coalesce((v_result ->> 'ok')::boolean, false) is not true then
        perform app_private.write_provisioning_event(
          v_user.id,
          'failed',
          v_role,
          'repair_orphaned_signup',
          coalesce(v_result ->> 'message', 'Orphaned signup repair failed.'),
          jsonb_build_object('result', coalesce(v_result, '{}'::jsonb))
        );
      end if;
    exception
      when others then
        perform app_private.write_provisioning_event(
          v_user.id,
          'failed',
          v_role,
          'repair_orphaned_signup',
          'Orphaned signup repair failed.',
          jsonb_build_object('sqlstate', sqlstate, 'detail', sqlerrm)
        );
    end;
  end loop;
end;
$$;

grant execute on function app_private.provision_new_auth_user()
  to supabase_auth_admin;
