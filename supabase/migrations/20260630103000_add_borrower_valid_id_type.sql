alter table public.borrower_verification_documents
  add column if not exists valid_id_type text;

alter table public.borrower_verification_documents
  drop constraint if exists borrower_verification_documents_valid_id_type_check,
  add constraint borrower_verification_documents_valid_id_type_check
    check (
      (
        document_type = 'valid_id'
        and (
          valid_id_type is null
          or valid_id_type in (
            'student_id',
            'drivers_license',
            'passport',
            'sss',
            'postal_id'
          )
        )
      )
      or (
        document_type <> 'valid_id'
        and valid_id_type is null
      )
    );

create or replace function public.submit_borrower_verification_document(
  p_borrower_verification_id uuid,
  p_storage_path text,
  p_document_type public.borrower_verification_document_type,
  p_valid_id_type text default null,
  p_file_name text default null,
  p_file_type text default null,
  p_file_size integer default null,
  p_ai_review_status text default 'not_run',
  p_ai_review_confidence numeric default null,
  p_ai_detected_document_type text default null,
  p_ai_review_reason text default null,
  p_ai_risk_flags text[] default '{}'::text[],
  p_ai_model text default null,
  p_ai_reviewed_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
  v_valid_id_type text := nullif(btrim(coalesce(p_valid_id_type, '')), '');
begin
  if p_document_type = 'valid_id'
    and v_valid_id_type not in (
      'student_id',
      'drivers_license',
      'passport',
      'sss',
      'postal_id'
    ) then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_valid_id_type',
      'message', 'Choose the valid ID type.'
    );
  end if;

  if p_document_type <> 'valid_id' then
    v_valid_id_type := null;
  end if;

  v_result := app_private.submit_borrower_verification_document(
    p_borrower_verification_id,
    p_storage_path,
    p_document_type,
    p_file_name,
    p_file_type,
    p_file_size,
    p_ai_review_status,
    p_ai_review_confidence,
    p_ai_detected_document_type,
    p_ai_review_reason,
    p_ai_risk_flags,
    p_ai_model,
    p_ai_reviewed_at
  );

  if coalesce((v_result->>'ok')::boolean, false)
    and nullif(v_result->>'document_id', '') is not null then
    update public.borrower_verification_documents
    set valid_id_type = v_valid_id_type
    where id = (v_result->>'document_id')::uuid;
  end if;

  return v_result;
end;
$$;

grant execute on function public.submit_borrower_verification_document(
  uuid,
  text,
  public.borrower_verification_document_type,
  text,
  text,
  text,
  integer,
  text,
  numeric,
  text,
  text,
  text[],
  text,
  timestamptz
) to authenticated;
