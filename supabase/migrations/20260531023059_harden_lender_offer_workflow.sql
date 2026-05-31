-- Harden lender offer creation and review-state visibility.
-- The RPC remains the source of truth for offer authorization, requested-amount
-- limits, configured lender loan ranges, duplicate pending offers, and accepted
-- offer closure.

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
  v_lender_min_loan_amount numeric(12, 2);
  v_lender_max_loan_amount numeric(12, 2);
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
    lender_profiles.min_loan_amount,
    lender_profiles.max_loan_amount
  into
    v_lender_min_loan_amount,
    v_lender_max_loan_amount
  from public.lender_profiles
  where lender_profiles.user_id = v_actor_id
    and lender_profiles.verification_status = 'approved';

  if v_lender_min_loan_amount is not null
    and p_approved_amount < v_lender_min_loan_amount
  then
    return jsonb_build_object(
      'ok', false,
      'message', 'Approved amount is below your configured minimum loan amount.'
    );
  end if;

  if v_lender_max_loan_amount is not null
    and p_approved_amount > v_lender_max_loan_amount
  then
    return jsonb_build_object(
      'ok', false,
      'message', 'Approved amount exceeds your configured maximum loan amount.'
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

create or replace function public.create_loan_offer(
  p_loan_application_id uuid,
  p_approved_amount numeric,
  p_repayment_amount numeric,
  p_fees numeric,
  p_due_date date,
  p_remarks text default null
)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.create_loan_offer(
    p_loan_application_id,
    p_approved_amount,
    p_repayment_amount,
    p_fees,
    p_due_date,
    p_remarks
  );
$$;

grant execute on function app_private.create_loan_offer(
  uuid, numeric, numeric, numeric, date, text
) to authenticated;
grant execute on function public.create_loan_offer(
  uuid, numeric, numeric, numeric, date, text
) to authenticated;

create or replace function app_private.get_lender_application_offer_flags(
  p_loan_application_ids uuid[]
)
returns table (
  loan_application_id uuid,
  has_accepted_offer boolean
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    loan_applications.id as loan_application_id,
    exists (
      select 1
      from public.loan_offers
      where loan_offers.loan_application_id = loan_applications.id
        and loan_offers.status = 'accepted'
    ) as has_accepted_offer
  from public.loan_applications
  where auth.uid() is not null
    and app_private.is_approved_lender(auth.uid())
    and loan_applications.id = any(coalesce(p_loan_application_ids, array[]::uuid[]))
    and (
      loan_applications.status in ('submitted', 'open')
      or exists (
        select 1
        from public.loan_offers
        where loan_offers.loan_application_id = loan_applications.id
          and loan_offers.lender_id = auth.uid()
      )
    );
$$;

create or replace function public.get_lender_application_offer_flags(
  p_loan_application_ids uuid[]
)
returns table (
  loan_application_id uuid,
  has_accepted_offer boolean
)
language sql
security invoker
set search_path = public, pg_temp
as $$
  select *
  from app_private.get_lender_application_offer_flags(p_loan_application_ids);
$$;

grant execute on function app_private.get_lender_application_offer_flags(uuid[])
  to authenticated;
grant execute on function public.get_lender_application_offer_flags(uuid[])
  to authenticated;

create or replace function app_private.submit_lender_onboarding(
  p_organization_name text,
  p_contact_person text,
  p_phone_number text,
  p_business_address text,
  p_operating_area text,
  p_business_registration_number text,
  p_min_loan_amount numeric(12, 2),
  p_max_loan_amount numeric(12, 2),
  p_typical_repayment_terms text,
  p_lender_description text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_lender_profile public.lender_profiles%rowtype;
  v_previous_status public.lender_verification_status;
begin
  if v_actor_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Sign in to complete your lender profile.'
    );
  end if;

  select *
  into v_lender_profile
  from public.lender_profiles
  where user_id = v_actor_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'Lender profile was not found. Contact support for assistance.'
    );
  end if;

  v_previous_status := v_lender_profile.verification_status;

  if v_lender_profile.verification_status not in ('incomplete', 'rejected') then
    return jsonb_build_object(
      'ok', false,
      'message', 'Your lender profile cannot be updated at this time.'
    );
  end if;

  if p_organization_name is null or char_length(p_organization_name) not between 2 and 160 then
    return jsonb_build_object('ok', false, 'message', 'Organization name must be between 2 and 160 characters.');
  end if;

  if p_contact_person is null or char_length(p_contact_person) not between 2 and 120 then
    return jsonb_build_object('ok', false, 'message', 'Contact person must be between 2 and 120 characters.');
  end if;

  if p_phone_number is null or char_length(p_phone_number) not between 7 and 30 then
    return jsonb_build_object('ok', false, 'message', 'Phone number must be between 7 and 30 characters.');
  end if;

  if p_business_address is null or char_length(p_business_address) not between 5 and 240 then
    return jsonb_build_object('ok', false, 'message', 'Business address must be between 5 and 240 characters.');
  end if;

  if p_operating_area is null or char_length(p_operating_area) not between 2 and 160 then
    return jsonb_build_object('ok', false, 'message', 'Operating area must be between 2 and 160 characters.');
  end if;

  if p_business_registration_number is not null
    and char_length(p_business_registration_number) not between 2 and 80 then
    return jsonb_build_object('ok', false, 'message', 'Business registration number must be between 2 and 80 characters.');
  end if;

  if p_min_loan_amount is null
    or p_max_loan_amount is null
    or p_min_loan_amount <= 0
    or p_max_loan_amount <= 0
    or p_max_loan_amount < p_min_loan_amount then
    return jsonb_build_object('ok', false, 'message', 'Valid loan amount limits are required.');
  end if;

  if p_typical_repayment_terms is null or char_length(p_typical_repayment_terms) not between 2 and 240 then
    return jsonb_build_object('ok', false, 'message', 'Repayment terms must be between 2 and 240 characters.');
  end if;

  if p_lender_description is null or char_length(p_lender_description) not between 20 and 800 then
    return jsonb_build_object('ok', false, 'message', 'Lender description must be between 20 and 800 characters.');
  end if;

  update public.lender_profiles
  set
    organization_name = p_organization_name,
    contact_person = p_contact_person,
    phone_number = p_phone_number,
    business_address = p_business_address,
    operating_area = p_operating_area,
    business_registration_number = p_business_registration_number,
    min_loan_amount = p_min_loan_amount,
    max_loan_amount = p_max_loan_amount,
    typical_repayment_terms = p_typical_repayment_terms,
    lender_description = p_lender_description,
    verification_status = 'pending',
    approved_at = null,
    approved_by = null,
    rejected_at = null,
    rejected_by = null,
    rejection_reason = null,
    manager_review_notes = null,
    updated_at = now()
  where id = v_lender_profile.id
  returning * into v_lender_profile;

  perform app_private.write_audit_log(
    'lender_onboarding_submitted',
    'lender_profiles',
    v_lender_profile.id,
    jsonb_build_object(
      'user_id', v_actor_id,
      'organization_name', v_lender_profile.organization_name,
      'previous_status', v_previous_status,
      'new_status', 'pending'
    )
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Lender profile submitted for review.',
    'lender_profile_id', v_lender_profile.id,
    'verification_status', 'pending'
  );
end;
$$;

create or replace function public.submit_lender_onboarding(
  p_organization_name text,
  p_contact_person text,
  p_phone_number text,
  p_business_address text,
  p_operating_area text,
  p_business_registration_number text,
  p_min_loan_amount numeric(12, 2),
  p_max_loan_amount numeric(12, 2),
  p_typical_repayment_terms text,
  p_lender_description text
)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.submit_lender_onboarding(
    p_organization_name,
    p_contact_person,
    p_phone_number,
    p_business_address,
    p_operating_area,
    p_business_registration_number,
    p_min_loan_amount,
    p_max_loan_amount,
    p_typical_repayment_terms,
    p_lender_description
  );
$$;

grant execute on function app_private.submit_lender_onboarding(
  text, text, text, text, text, text, numeric, numeric, text, text
) to authenticated;
grant execute on function public.submit_lender_onboarding(
  text, text, text, text, text, text, numeric, numeric, text, text
) to authenticated;
