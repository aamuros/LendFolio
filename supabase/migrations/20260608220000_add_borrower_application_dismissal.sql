alter table public.loan_applications
  add column if not exists borrower_removed_at timestamptz;

create or replace function public.dismiss_withdrawn_loan_application(
  p_application_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application public.loan_applications%rowtype;
begin
  select *
  into v_application
  from public.loan_applications
  where id = p_application_id
    and borrower_id = auth.uid()
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'code', 'not_found',
      'message', 'Application not found.'
    );
  end if;

  if v_application.status <> 'withdrawn' then
    return jsonb_build_object(
      'ok', false,
      'code', 'not_withdrawn',
      'message', 'Only withdrawn applications can be removed.'
    );
  end if;

  update public.loan_applications
  set
    borrower_removed_at = coalesce(borrower_removed_at, now()),
    updated_at = now()
  where id = p_application_id
    and borrower_id = auth.uid();

  return jsonb_build_object(
    'ok', true,
    'message', 'Withdrawn application removed.'
  );
end;
$$;

revoke all on function public.dismiss_withdrawn_loan_application(uuid) from public;
grant execute on function public.dismiss_withdrawn_loan_application(uuid) to authenticated;
