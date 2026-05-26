create or replace function app_private.current_required_consents(
  p_consent_types public.user_consent_type[]
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'consent_type', required.consent_type::text,
        'version', coalesce(document.version, '__missing_current_legal_document__')
      )
      order by required.ordinality
    ),
    '[]'::jsonb
  )
  from unnest(p_consent_types) with ordinality as required(consent_type, ordinality)
  left join public.legal_documents document
    on document.consent_type = required.consent_type
   and document.retired_at is null;
$$;

create or replace function app_private.has_current_user_consents(
  p_user_id uuid,
  p_required jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_required_count integer;
  v_matched_count integer;
begin
  if p_user_id is null
    or p_required is null
    or jsonb_typeof(p_required) <> 'array'
  then
    return false;
  end if;

  select count(*)
  into v_required_count
  from jsonb_array_elements(p_required) as required
  where required ? 'consent_type'
    and required ? 'version'
    and nullif(btrim(required->>'version'), '') is not null;

  if v_required_count = 0 then
    return false;
  end if;

  select count(*)
  into v_matched_count
  from jsonb_array_elements(p_required) as required
  join public.legal_documents document
    on document.consent_type = (required->>'consent_type')::public.user_consent_type
   and document.version = required->>'version'
   and document.retired_at is null
  where exists (
    select 1
    from public.user_consents consent
    where consent.user_id = p_user_id
      and consent.consent_type = document.consent_type
      and consent.version = document.version
  );

  return v_matched_count = v_required_count;
exception
  when invalid_text_representation then
    return false;
end;
$$;

create or replace function app_private.borrower_document_upload_required_consents()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app_private.current_required_consents(array[
    'terms_of_service'::public.user_consent_type,
    'privacy_notice'::public.user_consent_type,
    'document_processing_consent'::public.user_consent_type
  ]);
$$;

create or replace function app_private.borrower_loan_application_required_consents()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app_private.current_required_consents(array[
    'terms_of_service'::public.user_consent_type,
    'privacy_notice'::public.user_consent_type,
    'credit_review_authorization'::public.user_consent_type
  ]);
$$;

create or replace function app_private.lender_review_required_consents()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app_private.current_required_consents(array[
    'terms_of_service'::public.user_consent_type,
    'privacy_notice'::public.user_consent_type,
    'lender_review_consent'::public.user_consent_type
  ]);
$$;

grant execute on function app_private.current_required_consents(public.user_consent_type[])
  to authenticated;
grant execute on function app_private.has_current_user_consents(uuid, jsonb)
  to authenticated;
