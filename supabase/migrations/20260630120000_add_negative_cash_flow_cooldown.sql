alter table public.borrower_portfolios
  add column if not exists negative_cash_flow_blocked_until timestamptz;

create or replace function app_private.set_negative_cash_flow_cooldown()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_net_cash_flow numeric;
begin
  v_net_cash_flow := coalesce(new.monthly_gross_revenue, 0)
    - coalesce(new.monthly_expenses, 0)
    - coalesce(new.existing_loan_payments, 0);

  if v_net_cash_flow < 0 then
    if new.negative_cash_flow_blocked_until is null
      or new.negative_cash_flow_blocked_until <= now() then
      new.negative_cash_flow_blocked_until := now() + interval '30 days';
    end if;
  elsif new.negative_cash_flow_blocked_until <= now() then
    new.negative_cash_flow_blocked_until := null;
  end if;

  return new;
end;
$$;

drop trigger if exists set_negative_cash_flow_cooldown on public.borrower_portfolios;
create trigger set_negative_cash_flow_cooldown
before insert or update of monthly_gross_revenue, monthly_expenses, existing_loan_payments
on public.borrower_portfolios
for each row execute function app_private.set_negative_cash_flow_cooldown();

update public.borrower_portfolios
set negative_cash_flow_blocked_until = now() + interval '30 days'
where coalesce(monthly_gross_revenue, 0)
    - coalesce(monthly_expenses, 0)
    - coalesce(existing_loan_payments, 0) < 0
  and negative_cash_flow_blocked_until is null;

create or replace function app_private.negative_cash_flow_cooldown(
  p_borrower_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'active', coalesce(bp.negative_cash_flow_blocked_until > now(), false),
    'retry_at', bp.negative_cash_flow_blocked_until,
    'days_remaining', case
      when bp.negative_cash_flow_blocked_until > now()
        then greatest(1, ceil(extract(epoch from (bp.negative_cash_flow_blocked_until - now())) / 86400.0))::integer
      else 0
    end
  )
  from public.borrower_portfolios bp
  where bp.borrower_id = p_borrower_id;
$$;

-- The submission RPC checks application_ready from this function. Wrapping the
-- existing result keeps every current gate and adds the authoritative cooldown.
create or replace function app_private.borrower_application_readiness_with_cooldown(
  p_borrower_id uuid,
  p_base jsonb
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when coalesce((c.value->>'active')::boolean, false) then
      jsonb_set(
        jsonb_set(
          jsonb_set(p_base, '{ok}', 'false'::jsonb),
          '{application_ready}', 'false'::jsonb
        ),
        '{negative_cash_flow_cooldown}', c.value
      ) || jsonb_build_object(
        'primary_code', 'negative_cash_flow_cooldown',
        'message', format(
          'Your loan application is paused for %s more day(s). Update and resubmit your business profile after %s.',
          c.value->>'days_remaining',
          to_char((c.value->>'retry_at')::timestamptz at time zone 'Asia/Manila', 'Mon DD, YYYY')
        )
      )
    else p_base || jsonb_build_object('negative_cash_flow_cooldown', c.value)
  end
  from (select coalesce(app_private.negative_cash_flow_cooldown(p_borrower_id), '{"active":false,"days_remaining":0}'::jsonb) as value) c;
$$;

-- Existing deployments call borrower_application_readiness directly. Rename the
-- current implementation once, then install the cooldown-aware public contract.
alter function app_private.borrower_application_readiness(uuid)
  rename to borrower_application_readiness_without_cash_flow_cooldown;

create function app_private.borrower_application_readiness(p_borrower_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app_private.borrower_application_readiness_with_cooldown(
    p_borrower_id,
    app_private.borrower_application_readiness_without_cash_flow_cooldown(p_borrower_id)
  );
$$;

revoke all on function app_private.negative_cash_flow_cooldown(uuid) from public;
revoke all on function app_private.borrower_application_readiness_with_cooldown(uuid, jsonb) from public;
revoke all on function app_private.borrower_application_readiness(uuid) from public;
