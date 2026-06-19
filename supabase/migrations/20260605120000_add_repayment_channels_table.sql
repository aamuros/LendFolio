-- Add repayment_channels table so lenders can add multiple repayment channels per active loan.
-- 1. Create the repayment_channels table.
-- 2. Add RLS policies for borrower, lender, and manager access.
-- 3. Create add_repayment_channel RPC.
-- 4. Create remove_repayment_channel RPC.

-- 1. Create the repayment_channels table.
create table if not exists public.repayment_channels (
  id uuid primary key default gen_random_uuid(),
  active_loan_id uuid not null references public.active_loans (id) on delete cascade,
  lender_id uuid not null references public.profiles (id) on delete restrict,
  channel text not null,
  account_name text not null,
  account_number text not null,
  instructions text,
  created_at timestamptz not null default now(),
  constraint repayment_channel_channel_length check (char_length(btrim(channel)) between 1 and 100),
  constraint repayment_channel_account_name_length check (char_length(btrim(account_name)) between 1 and 200),
  constraint repayment_channel_account_number_length check (char_length(btrim(account_number)) between 1 and 100),
  constraint repayment_channel_instructions_length check (instructions is null or char_length(instructions) <= 500)
);

create index if not exists repayment_channels_active_loan_id_idx
  on public.repayment_channels (active_loan_id);

create index if not exists repayment_channels_lender_id_idx
  on public.repayment_channels (lender_id);

-- 2. RLS policies.
alter table public.repayment_channels enable row level security;

drop policy if exists "repayment_channels_select_access"
  on public.repayment_channels;

create policy "repayment_channels_select_access"
  on public.repayment_channels for select
  to authenticated
  using (
    exists (
      select 1
      from public.active_loans
      where active_loans.id = repayment_channels.active_loan_id
        and (
          (select auth.uid()) = active_loans.borrower_id
          or (
            (select auth.uid()) = active_loans.lender_id
            and app_private.is_approved_lender((select auth.uid()))
          )
          or app_private.is_manager((select auth.uid()))
        )
    )
  );

drop policy if exists "repayment_channels_insert_access"
  on public.repayment_channels;

create policy "repayment_channels_insert_access"
  on public.repayment_channels for insert
  to authenticated
  with check (
    (select auth.uid()) = lender_id
    and app_private.is_approved_lender((select auth.uid()))
    and exists (
      select 1
      from public.active_loans
      where active_loans.id = repayment_channels.active_loan_id
        and active_loans.lender_id = (select auth.uid())
        and active_loans.status in ('active', 'overdue')
    )
  );

drop policy if exists "repayment_channels_delete_access"
  on public.repayment_channels;

create policy "repayment_channels_delete_access"
  on public.repayment_channels for delete
  to authenticated
  using (
    (select auth.uid()) = lender_id
    and app_private.is_approved_lender((select auth.uid()))
    and exists (
      select 1
      from public.active_loans
      where active_loans.id = repayment_channels.active_loan_id
        and active_loans.lender_id = (select auth.uid())
    )
  );

grant select, insert, delete on public.repayment_channels to authenticated;

-- 3. Create add_repayment_channel RPC.
create or replace function app_private.add_repayment_channel(
  p_active_loan_id uuid,
  p_channel text,
  p_account_name text,
  p_account_number text,
  p_instructions text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_loan record;
  v_channel_id uuid;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_approved_lender(v_actor_id) then
    return jsonb_build_object('ok', false, 'message', 'Only approved lenders can add repayment channels.');
  end if;

  if p_active_loan_id is null then
    return jsonb_build_object('ok', false, 'message', 'Choose an active loan.');
  end if;

  select id, lender_id, status
  into v_loan
  from public.active_loans
  where id = p_active_loan_id;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Active loan not found.');
  end if;

  if v_loan.lender_id <> v_actor_id then
    return jsonb_build_object('ok', false, 'message', 'Only the loan lender can add repayment channels.');
  end if;

  if v_loan.status not in ('active', 'overdue') then
    return jsonb_build_object('ok', false, 'message', 'Cannot add a repayment channel to a closed loan.');
  end if;

  if p_channel is null or char_length(btrim(p_channel)) = 0 then
    return jsonb_build_object('ok', false, 'message', 'Enter a repayment channel.');
  end if;

  if char_length(btrim(p_channel)) > 100 then
    return jsonb_build_object('ok', false, 'message', 'Keep repayment channel under 100 characters.');
  end if;

  if p_account_name is null or char_length(btrim(p_account_name)) = 0 then
    return jsonb_build_object('ok', false, 'message', 'Enter the account name.');
  end if;

  if char_length(btrim(p_account_name)) > 200 then
    return jsonb_build_object('ok', false, 'message', 'Keep account name under 200 characters.');
  end if;

  if p_account_number is null or char_length(btrim(p_account_number)) = 0 then
    return jsonb_build_object('ok', false, 'message', 'Enter the account number.');
  end if;

  if char_length(btrim(p_account_number)) > 100 then
    return jsonb_build_object('ok', false, 'message', 'Keep account number under 100 characters.');
  end if;

  if p_instructions is not null and char_length(p_instructions) > 500 then
    return jsonb_build_object('ok', false, 'message', 'Keep instructions under 500 characters.');
  end if;

  insert into public.repayment_channels (
    active_loan_id,
    lender_id,
    channel,
    account_name,
    account_number,
    instructions
  )
  values (
    p_active_loan_id,
    v_actor_id,
    btrim(p_channel),
    btrim(p_account_name),
    btrim(p_account_number),
    nullif(btrim(coalesce(p_instructions, '')), '')
  )
  returning id into v_channel_id;

  perform app_private.write_audit_log(
    'repayment_channel_added',
    'repayment_channels',
    v_channel_id,
    jsonb_build_object('active_loan_id', p_active_loan_id, 'channel', btrim(p_channel))
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Repayment channel added.',
    'channel_id', v_channel_id
  );
end;
$$;

create or replace function public.add_repayment_channel(
  p_active_loan_id uuid,
  p_channel text,
  p_account_name text,
  p_account_number text,
  p_instructions text default null
)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.add_repayment_channel(
    p_active_loan_id,
    p_channel,
    p_account_name,
    p_account_number,
    p_instructions
  );
$$;

-- 4. Create remove_repayment_channel RPC.
create or replace function app_private.remove_repayment_channel(
  p_channel_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_channel record;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_approved_lender(v_actor_id) then
    return jsonb_build_object('ok', false, 'message', 'Only approved lenders can remove repayment channels.');
  end if;

  select id, active_loan_id, lender_id, channel
  into v_channel
  from public.repayment_channels
  where id = p_channel_id;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Repayment channel not found.');
  end if;

  if v_channel.lender_id <> v_actor_id then
    return jsonb_build_object('ok', false, 'message', 'Only the lender who added this channel can remove it.');
  end if;

  delete from public.repayment_channels
  where id = p_channel_id;

  perform app_private.write_audit_log(
    'repayment_channel_removed',
    'repayment_channels',
    p_channel_id,
    jsonb_build_object('active_loan_id', v_channel.active_loan_id, 'channel', v_channel.channel)
  );

  return jsonb_build_object('ok', true, 'message', 'Repayment channel removed.');
end;
$$;

create or replace function public.remove_repayment_channel(
  p_channel_id uuid
)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.remove_repayment_channel(p_channel_id);
$$;

grant execute on function public.add_repayment_channel(uuid, text, text, text, text) to authenticated;
grant execute on function public.remove_repayment_channel(uuid) to authenticated;
