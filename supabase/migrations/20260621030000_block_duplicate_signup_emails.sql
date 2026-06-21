create or replace function public.signup_email_exists(p_email text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from auth.users
    where lower(email) = lower(btrim(p_email))
  );
$$;

revoke all on function public.signup_email_exists(text) from public;
grant execute on function public.signup_email_exists(text) to anon, authenticated;

comment on function public.signup_email_exists(text) is
  'Checks email uniqueness before signup so an existing auth user is not sent another confirmation email.';
