create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  consent_type public.user_consent_type not null,
  version text not null,
  title text not null,
  document_url text,
  published_at timestamptz not null default now(),
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  constraint legal_documents_version_valid
    check (char_length(btrim(version)) between 1 and 80),
  constraint legal_documents_title_valid
    check (char_length(btrim(title)) between 2 and 160),
  constraint legal_documents_url_length
    check (document_url is null or char_length(document_url) <= 500),
  constraint legal_documents_retired_after_published
    check (retired_at is null or retired_at >= published_at)
);

create unique index if not exists legal_documents_type_version_unique_idx
  on public.legal_documents (consent_type, version);

create unique index if not exists legal_documents_one_current_per_type_idx
  on public.legal_documents (consent_type)
  where retired_at is null;

create index if not exists legal_documents_current_idx
  on public.legal_documents (consent_type, published_at desc)
  where retired_at is null;

alter table public.legal_documents enable row level security;

drop policy if exists "legal_documents_select_current" on public.legal_documents;

create policy "legal_documents_select_current"
  on public.legal_documents for select
  to anon, authenticated
  using (retired_at is null);

revoke insert, update, delete on public.legal_documents from anon;
revoke insert, update, delete on public.legal_documents from authenticated;

insert into public.legal_documents (
  consent_type,
  version,
  title,
  document_url,
  published_at
)
values
  (
    'terms_of_service',
    '2026-05-terms-v1',
    'LendFolio Terms of Service',
    '/legal/terms',
    '2026-05-26 00:00:00+00'
  ),
  (
    'privacy_notice',
    '2026-05-privacy-v1',
    'LendFolio Privacy Notice',
    '/legal/privacy',
    '2026-05-26 00:00:00+00'
  ),
  (
    'credit_review_authorization',
    '2026-05-credit-review-v1',
    'LendFolio Credit Review Authorization',
    null,
    '2026-05-26 00:00:00+00'
  ),
  (
    'document_processing_consent',
    '2026-05-document-processing-v1',
    'LendFolio Document Processing Consent',
    null,
    '2026-05-26 00:00:00+00'
  ),
  (
    'lender_review_consent',
    '2026-05-lender-review-v1',
    'LendFolio Lender Review Consent',
    null,
    '2026-05-26 00:00:00+00'
  )
on conflict (consent_type, version) do update
set
  title = excluded.title,
  document_url = excluded.document_url,
  published_at = excluded.published_at
where public.legal_documents.retired_at is null;

create or replace function app_private.prevent_user_consents_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  raise exception 'User consent records are append-only.';
end;
$$;

drop trigger if exists user_consents_append_only_trigger on public.user_consents;

create trigger user_consents_append_only_trigger
  before update or delete on public.user_consents
  for each row
  execute function app_private.prevent_user_consents_mutation();

create or replace function app_private.accept_user_consents(
  p_consents jsonb,
  p_ip_address inet default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_accepted_count integer := 0;
  v_consent_types text[];
  v_input_count integer := 0;
  v_valid_count integer := 0;
  v_stale_count integer := 0;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  if not exists (select 1 from public.profiles where id = v_actor_id) then
    return jsonb_build_object(
      'ok', false,
      'message', 'Your account does not have access to this workspace.'
    );
  end if;

  if p_consents is null or jsonb_typeof(p_consents) <> 'array' then
    return jsonb_build_object(
      'ok', false,
      'message', 'Choose the disclosures to accept.'
    );
  end if;

  v_input_count := jsonb_array_length(p_consents);

  if v_input_count = 0 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Choose the disclosures to accept.'
    );
  end if;

  if p_user_agent is not null and char_length(p_user_agent) > 500 then
    p_user_agent := left(p_user_agent, 500);
  end if;

  with requested as (
    select
      (item->>'consent_type')::public.user_consent_type as consent_type,
      btrim(item->>'version') as version
    from jsonb_array_elements(p_consents) as item
    where item ? 'consent_type'
      and item ? 'version'
      and nullif(btrim(item->>'version'), '') is not null
      and char_length(btrim(item->>'version')) <= 80
  )
  select count(*)
  into v_valid_count
  from requested;

  if v_valid_count <> v_input_count then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not accept these disclosures.'
    );
  end if;

  with requested as (
    select distinct
      (item->>'consent_type')::public.user_consent_type as consent_type,
      btrim(item->>'version') as version
    from jsonb_array_elements(p_consents) as item
  )
  select count(*)
  into v_stale_count
  from requested
  left join public.legal_documents document
    on document.consent_type = requested.consent_type
   and document.version = requested.version
   and document.retired_at is null
  where document.id is null;

  if v_stale_count > 0 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Accept the current disclosures before continuing.'
    );
  end if;

  with requested as (
    select distinct
      (item->>'consent_type')::public.user_consent_type as consent_type,
      btrim(item->>'version') as version
    from jsonb_array_elements(p_consents) as item
  ),
  inserted as (
    insert into public.user_consents (
      user_id,
      consent_type,
      version,
      ip_address,
      user_agent
    )
    select
      v_actor_id,
      requested.consent_type,
      requested.version,
      p_ip_address,
      p_user_agent
    from requested
    on conflict (user_id, consent_type, version) do nothing
    returning consent_type
  )
  select
    count(*),
    coalesce(array_agg(consent_type::text order by consent_type::text), array[]::text[])
  into v_accepted_count, v_consent_types
  from inserted;

  perform app_private.write_audit_log(
    'user_consents_accepted',
    'user_consents',
    v_actor_id,
    jsonb_build_object(
      'accepted_count', v_accepted_count,
      'consent_types', to_jsonb(v_consent_types)
    )
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Required disclosures accepted.',
    'accepted_count', v_accepted_count,
    'consent_types', to_jsonb(v_consent_types)
  );
exception
  when invalid_text_representation then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not accept these disclosures.'
    );
  when check_violation then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not accept these disclosures.'
    );
end;
$$;
