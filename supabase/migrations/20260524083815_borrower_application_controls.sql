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
  v_declined_count integer := 0;
begin
  if v_actor_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Sign in to continue.'
    );
  end if;

  select loan_application_id
  into v_application_id
  from public.loan_offers
  where id = p_offer_id;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not accept this offer.'
    );
  end if;

  perform pg_advisory_xact_lock(hashtext(v_application_id::text));

  select
    loan_offers.id,
    loan_offers.loan_application_id,
    loan_offers.borrower_id,
    loan_offers.status as offer_status,
    loan_applications.status as application_status
  into v_offer
  from public.loan_applications
  join public.loan_offers
    on loan_offers.loan_application_id = loan_applications.id
  where loan_offers.id = p_offer_id
  for update of loan_applications, loan_offers;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not accept this offer.'
    );
  end if;

  if v_offer.borrower_id <> v_actor_id then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not accept this offer.'
    );
  end if;

  if v_offer.offer_status <> 'pending' then
    return jsonb_build_object(
      'ok', false,
      'message', 'This offer is no longer pending.'
    );
  end if;

  if v_offer.application_status not in ('submitted', 'open') then
    return jsonb_build_object(
      'ok', false,
      'message', 'This application is no longer open.'
    );
  end if;

  update public.loan_offers
  set
    status = 'accepted',
    updated_at = now()
  where id = v_offer.id;

  update public.loan_offers
  set
    status = 'declined',
    updated_at = now()
  where loan_application_id = v_offer.loan_application_id
    and id <> v_offer.id
    and status = 'pending';

  get diagnostics v_declined_count = row_count;

  update public.loan_applications
  set
    status = 'accepted',
    updated_at = now()
  where id = v_offer.loan_application_id
    and borrower_id = v_actor_id
    and status in ('submitted', 'open');

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

  return jsonb_build_object(
    'ok', true,
    'message', 'Offer accepted.',
    'loan_application_id', v_offer.loan_application_id,
    'accepted_offer_id', v_offer.id,
    'declined_offer_count', v_declined_count
  );
end;
$$;

create or replace function app_private.update_loan_application(
  p_application_id uuid,
  p_requested_amount numeric,
  p_purpose text,
  p_preferred_term public.preferred_term,
  p_remarks text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_application record;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_borrower(v_actor_id) then
    return jsonb_build_object('ok', false, 'message', 'Could not save changes.');
  end if;

  select
    id,
    borrower_id,
    status
  into v_application
  from public.loan_applications
  where id = p_application_id
  for update;

  if not found or v_application.borrower_id <> v_actor_id then
    return jsonb_build_object('ok', false, 'message', 'Could not save changes.');
  end if;

  if v_application.status not in ('submitted', 'open') then
    return jsonb_build_object(
      'ok', false,
      'message', 'This application can no longer be edited.'
    );
  end if;

  update public.loan_applications
  set
    requested_amount = p_requested_amount,
    purpose = trim(p_purpose),
    preferred_term = p_preferred_term,
    remarks = nullif(trim(coalesce(p_remarks, '')), ''),
    updated_at = now()
  where id = p_application_id
  returning id, borrower_id, borrower_portfolio_id, requested_amount, purpose,
    preferred_term, remarks, status, submitted_at, created_at, updated_at
  into v_application;

  perform app_private.write_audit_log(
    'application_updated',
    'loan_applications',
    p_application_id,
    jsonb_build_object('status', v_application.status)
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Application updated.',
    'application', to_jsonb(v_application)
  );
end;
$$;

create or replace function app_private.withdraw_loan_application(p_application_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_application record;
  v_declined_count integer := 0;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_borrower(v_actor_id) then
    return jsonb_build_object('ok', false, 'message', 'Could not withdraw application.');
  end if;

  select
    id,
    borrower_id,
    status
  into v_application
  from public.loan_applications
  where id = p_application_id
  for update;

  if not found or v_application.borrower_id <> v_actor_id then
    return jsonb_build_object('ok', false, 'message', 'Could not withdraw application.');
  end if;

  if v_application.status not in ('submitted', 'open') then
    return jsonb_build_object(
      'ok', false,
      'message', 'This application can no longer be withdrawn.'
    );
  end if;

  update public.loan_applications
  set
    status = 'withdrawn',
    updated_at = now()
  where id = p_application_id
  returning id, borrower_id, borrower_portfolio_id, requested_amount, purpose,
    preferred_term, remarks, status, submitted_at, created_at, updated_at
  into v_application;

  update public.loan_offers
  set
    status = 'declined',
    updated_at = now()
  where loan_application_id = p_application_id
    and borrower_id = v_actor_id
    and status = 'pending';

  get diagnostics v_declined_count = row_count;

  perform app_private.write_audit_log(
    'application_withdrawn',
    'loan_applications',
    p_application_id,
    jsonb_build_object('declined_pending_offer_count', v_declined_count)
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Application withdrawn.',
    'application', to_jsonb(v_application)
  );
end;
$$;

create or replace function app_private.decline_loan_offer(p_offer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_offer record;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_borrower(v_actor_id) then
    return jsonb_build_object('ok', false, 'message', 'Could not decline offer.');
  end if;

  select
    loan_offers.id,
    loan_offers.loan_application_id,
    loan_offers.borrower_id,
    loan_offers.status as offer_status,
    loan_applications.status as application_status
  into v_offer
  from public.loan_offers
  join public.loan_applications
    on loan_applications.id = loan_offers.loan_application_id
  where loan_offers.id = p_offer_id
  for update of loan_offers, loan_applications;

  if not found or v_offer.borrower_id <> v_actor_id then
    return jsonb_build_object('ok', false, 'message', 'Could not decline offer.');
  end if;

  if v_offer.offer_status <> 'pending' then
    return jsonb_build_object('ok', false, 'message', 'This offer is no longer pending.');
  end if;

  if v_offer.application_status not in ('submitted', 'open') then
    return jsonb_build_object('ok', false, 'message', 'This application is no longer open.');
  end if;

  update public.loan_offers
  set
    status = 'declined',
    updated_at = now()
  where id = p_offer_id;

  perform app_private.write_audit_log(
    'offer_declined',
    'loan_offers',
    p_offer_id,
    jsonb_build_object('loan_application_id', v_offer.loan_application_id)
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Offer declined.',
    'loan_application_id', v_offer.loan_application_id,
    'declined_offer_id', p_offer_id
  );
end;
$$;

create or replace function public.update_loan_application(
  p_application_id uuid,
  p_requested_amount numeric,
  p_purpose text,
  p_preferred_term public.preferred_term,
  p_remarks text
)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.update_loan_application(
    p_application_id,
    p_requested_amount,
    p_purpose,
    p_preferred_term,
    p_remarks
  );
$$;

create or replace function public.withdraw_loan_application(p_application_id uuid)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.withdraw_loan_application(p_application_id);
$$;

create or replace function public.decline_loan_offer(p_offer_id uuid)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.decline_loan_offer(p_offer_id);
$$;

grant execute on function app_private.update_loan_application(
  uuid,
  numeric,
  text,
  public.preferred_term,
  text
) to authenticated;
grant execute on function app_private.withdraw_loan_application(uuid) to authenticated;
grant execute on function app_private.decline_loan_offer(uuid) to authenticated;

grant execute on function public.update_loan_application(
  uuid,
  numeric,
  text,
  public.preferred_term,
  text
) to authenticated;
grant execute on function public.withdraw_loan_application(uuid) to authenticated;
grant execute on function public.decline_loan_offer(uuid) to authenticated;
