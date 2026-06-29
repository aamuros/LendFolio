create or replace function app_private.prevent_borrower_profile_update_during_cash_flow_cooldown()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.negative_cash_flow_blocked_until > now() then
    raise exception using
      errcode = 'P0001',
      message = 'borrower_profile_cash_flow_cooldown_active';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_borrower_profile_update_during_cash_flow_cooldown
  on public.borrower_portfolios;

create trigger prevent_borrower_profile_update_during_cash_flow_cooldown
before update on public.borrower_portfolios
for each row
execute function app_private.prevent_borrower_profile_update_during_cash_flow_cooldown();

revoke all on function app_private.prevent_borrower_profile_update_during_cash_flow_cooldown()
  from public;

