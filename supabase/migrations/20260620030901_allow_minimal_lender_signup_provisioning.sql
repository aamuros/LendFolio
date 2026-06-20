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
  v_address_region text := nullif(btrim(coalesce(p_user.raw_user_meta_data ->> 'address_region', '')), '');
  v_address_city text := nullif(btrim(coalesce(p_user.raw_user_meta_data ->> 'address_city', '')), '');
  v_address_barangay text := nullif(btrim(coalesce(p_user.raw_user_meta_data ->> 'address_barangay', '')), '');
  v_address_zip_code text := nullif(btrim(coalesce(p_user.raw_user_meta_data ->> 'address_zip_code', '')), '');
  v_min_loan_amount numeric(12, 2);
  v_max_loan_amount numeric(12, 2);
  v_typical_repayment_terms text := nullif(btrim(coalesce(p_user.raw_user_meta_data ->> 'typical_repayment_terms', '')), '');
  v_lender_description text := nullif(btrim(coalesce(p_user.raw_user_meta_data ->> 'lender_description', '')), '');
  v_existing_role public.app_role;
  v_has_full_lender_details boolean := false;
  v_verification_status text := 'incomplete';
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
    if v_organization_name is not null
      and char_length(v_organization_name) not between 2 and 160 then
      v_message := 'Organization name must be between 2 and 160 characters.';
      perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
      return jsonb_build_object('ok', false, 'message', v_message);
    end if;

    if v_contact_person is not null
      and char_length(v_contact_person) not between 2 and 120 then
      v_message := 'Contact person must be between 2 and 120 characters.';
      perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
      return jsonb_build_object('ok', false, 'message', v_message);
    end if;

    if v_phone_number is not null
      and char_length(v_phone_number) not between 7 and 30 then
      v_message := 'Phone number must be between 7 and 30 characters.';
      perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
      return jsonb_build_object('ok', false, 'message', v_message);
    end if;

    if v_business_address is not null
      and char_length(v_business_address) not between 5 and 240 then
      v_message := 'Business address must be between 5 and 240 characters.';
      perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
      return jsonb_build_object('ok', false, 'message', v_message);
    end if;

    if v_operating_area is not null
      and char_length(v_operating_area) not between 2 and 160 then
      v_message := 'Operating area must be between 2 and 160 characters.';
      perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
      return jsonb_build_object('ok', false, 'message', v_message);
    end if;

    if v_business_registration_number is not null
      and char_length(v_business_registration_number) not between 2 and 80 then
      v_message := 'Business registration number must be between 2 and 80 characters.';
      perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
      return jsonb_build_object('ok', false, 'message', v_message);
    end if;

    begin
      if (p_user.raw_user_meta_data ->> 'min_loan_amount') is not null then
        v_min_loan_amount := (p_user.raw_user_meta_data ->> 'min_loan_amount')::numeric(12, 2);
      end if;
      if (p_user.raw_user_meta_data ->> 'max_loan_amount') is not null then
        v_max_loan_amount := (p_user.raw_user_meta_data ->> 'max_loan_amount')::numeric(12, 2);
      end if;
    exception
      when invalid_text_representation or numeric_value_out_of_range then
        v_message := 'Valid loan amount limits are required.';
        perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
        return jsonb_build_object('ok', false, 'message', v_message);
    end;

    if (
        v_min_loan_amount is null
        and v_max_loan_amount is not null
      )
      or (
        v_min_loan_amount is not null
        and v_max_loan_amount is null
      ) then
      v_min_loan_amount := null;
      v_max_loan_amount := null;
    elsif v_min_loan_amount is not null
      and v_max_loan_amount is not null
      and (v_min_loan_amount <= 0 or v_max_loan_amount <= 0 or v_max_loan_amount < v_min_loan_amount) then
      v_message := 'Valid loan amount limits are required.';
      perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
      return jsonb_build_object('ok', false, 'message', v_message);
    end if;

    if v_typical_repayment_terms is not null
      and char_length(v_typical_repayment_terms) not between 2 and 240 then
      v_message := 'Repayment terms must be between 2 and 240 characters.';
      perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
      return jsonb_build_object('ok', false, 'message', v_message);
    end if;

    if v_lender_description is not null and char_length(v_lender_description) > 800 then
      v_message := 'Lender description must be 800 characters or fewer.';
      perform app_private.write_provisioning_event(p_user.id, 'failed', v_role, p_source, v_message);
      return jsonb_build_object('ok', false, 'message', v_message);
    end if;

    v_has_full_lender_details :=
      v_organization_name is not null
      and v_contact_person is not null
      and v_phone_number is not null
      and v_business_address is not null
      and v_operating_area is not null
      and v_min_loan_amount is not null
      and v_max_loan_amount is not null
      and v_typical_repayment_terms is not null;

    if v_has_full_lender_details then
      v_verification_status := 'pending';
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
      address_region,
      address_city_or_municipality,
      address_barangay,
      address_zip_code,
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
      v_address_region,
      v_address_city,
      v_address_barangay,
      v_address_zip_code,
      v_min_loan_amount,
      v_max_loan_amount,
      v_typical_repayment_terms,
      v_lender_description,
      v_verification_status::public.lender_verification_status,
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

drop trigger if exists on_auth_user_created_provision_lendfolio on auth.users;
create trigger on_auth_user_created_provision_lendfolio
  after insert on auth.users
  for each row execute function app_private.provision_new_auth_user();

grant execute on function app_private.provision_auth_user(auth.users, text)
  to supabase_auth_admin;
grant execute on function app_private.provision_new_auth_user()
  to supabase_auth_admin;
