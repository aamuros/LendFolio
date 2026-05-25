create schema if not exists app_private;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (btrim(type) <> ''),
  title text not null check (btrim(title) <> ''),
  message text not null check (btrim(message) <> ''),
  href text null check (href is null or btrim(href) <> ''),
  read_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

create index if not exists notifications_type_created_idx
  on public.notifications (type, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications_user_select_own"
  on public.notifications;
drop policy if exists "notifications_user_update_own"
  on public.notifications;
drop policy if exists "notifications_manager_select_all"
  on public.notifications;

create policy "notifications_user_select_own"
  on public.notifications for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "notifications_user_update_own"
  on public.notifications for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "notifications_manager_select_all"
  on public.notifications for select
  to authenticated
  using (app_private.is_manager((select auth.uid())));

revoke insert, update, delete on public.notifications from anon;
revoke insert, update, delete on public.notifications from authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create or replace function app_private.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_href text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_notification_id uuid;
  v_type text := btrim(coalesce(p_type, ''));
  v_title text := btrim(coalesce(p_title, ''));
  v_message text := btrim(coalesce(p_message, ''));
  v_href text := nullif(btrim(coalesce(p_href, '')), '');
begin
  if v_type = '' then
    raise exception 'Notification type is required.';
  end if;

  if v_title = '' then
    raise exception 'Notification title is required.';
  end if;

  if v_message = '' then
    raise exception 'Notification message is required.';
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    message,
    href
  )
  values (
    p_user_id,
    v_type,
    v_title,
    v_message,
    v_href
  )
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

revoke all on function app_private.create_notification(
  uuid,
  text,
  text,
  text,
  text
) from public, anon, authenticated;
