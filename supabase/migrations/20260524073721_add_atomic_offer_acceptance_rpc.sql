create or replace function app_private.accept_loan_offer(p_offer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_offer record;
  v_declined_count integer := 0;
begin
  if v_actor_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Sign in to continue.'
    );
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

create or replace function public.accept_loan_offer(p_offer_id uuid)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.accept_loan_offer(p_offer_id);
$$;

grant execute on function app_private.accept_loan_offer(uuid) to authenticated;
grant execute on function public.accept_loan_offer(uuid) to authenticated;
