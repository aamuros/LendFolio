-- Expose the current borrower's latest credit snapshot through a safe wrapper.
-- The wrapper never accepts a borrower id from the client.

create or replace function public.get_my_borrower_credit_snapshot(
  p_excluded_application_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_credit jsonb;
begin
  if v_actor_id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'auth_required',
      'message', 'Sign in to continue.'
    );
  end if;

  if not app_private.is_borrower(v_actor_id) then
    return jsonb_build_object(
      'ok', false,
      'code', 'not_allowed',
      'message', 'Unable to verify your latest credit limit. Please refresh and try again.'
    );
  end if;

  v_credit := app_private.get_borrower_credit_snapshot(
    v_actor_id,
    p_excluded_application_id
  );

  if coalesce((v_credit->>'ok')::boolean, false) is false then
    return jsonb_build_object(
      'ok', false,
      'code', coalesce(v_credit->>'code', 'credit_snapshot_unavailable'),
      'message', 'Unable to verify your latest credit limit. Please refresh and try again.'
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'current_credit_limit', (v_credit->>'current_credit_limit')::numeric,
    'active_principal_used', (v_credit->>'active_principal_used')::numeric,
    'available_credit', (v_credit->>'available_credit')::numeric
  );
end;
$$;

grant execute on function public.get_my_borrower_credit_snapshot(uuid) to authenticated;
