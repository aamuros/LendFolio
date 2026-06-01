do $$
begin
  if not exists (select 1 from pg_type where typname = 'lender_verification_document_type') then
    create type public.lender_verification_document_type as enum (
      'business_registration',
      'authorized_representative_id',
      'authorization_letter',
      'lending_license',
      'proof_of_address',
      'collection_policy',
      'sample_loan_terms',
      'other'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'lender_verification_document_status') then
    create type public.lender_verification_document_status as enum (
      'submitted',
      'accepted',
      'rejected',
      'superseded'
    );
  end if;
end
$$;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'lender-verification-documents',
  'lender-verification-documents',
  false,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.lender_verification_documents (
  id uuid primary key default gen_random_uuid(),
  lender_id uuid not null references public.profiles (id) on delete cascade,
  lender_profile_id uuid not null references public.lender_profiles (id) on delete cascade,
  storage_bucket text not null default 'lender-verification-documents',
  storage_path text not null,
  document_type public.lender_verification_document_type not null,
  file_name text not null,
  file_type text not null,
  file_size integer not null,
  status public.lender_verification_document_status not null default 'submitted',
  uploaded_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id),
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lender_verification_documents_bucket_check
    check (storage_bucket = 'lender-verification-documents'),
  constraint lender_verification_documents_storage_path_length
    check (char_length(btrim(storage_path)) between 1 and 512),
  constraint lender_verification_documents_file_name_length
    check (char_length(btrim(file_name)) between 1 and 240),
  constraint lender_verification_documents_file_type_check
    check (
      file_type in (
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf'
      )
    ),
  constraint lender_verification_documents_file_size_positive
    check (file_size > 0),
  constraint lender_verification_documents_file_size_limit
    check (file_size <= 5242880),
  constraint lender_verification_documents_review_notes_length
    check (review_notes is null or char_length(review_notes) <= 1000),
  constraint lender_verification_documents_review_state_valid
    check (
      (
        status in ('accepted', 'rejected')
        and reviewed_at is not null
        and reviewed_by is not null
      )
      or (
        status in ('submitted', 'superseded')
        and reviewed_at is null
        and reviewed_by is null
      )
    )
);

create unique index if not exists lender_verification_documents_storage_unique_idx
  on public.lender_verification_documents (storage_bucket, storage_path);

create index if not exists lender_verification_documents_lender_uploaded_idx
  on public.lender_verification_documents (lender_id, uploaded_at desc);

create index if not exists lender_verification_documents_profile_uploaded_idx
  on public.lender_verification_documents (lender_profile_id, uploaded_at desc);

create index if not exists lender_verification_documents_status_uploaded_idx
  on public.lender_verification_documents (status, uploaded_at desc);

alter table public.lender_verification_documents enable row level security;

drop policy if exists "lender_verification_documents_lender_select_own"
  on public.lender_verification_documents;
drop policy if exists "lender_verification_documents_manager_select_all"
  on public.lender_verification_documents;

create policy "lender_verification_documents_lender_select_own"
  on public.lender_verification_documents for select
  to authenticated
  using ((select auth.uid()) = lender_id);

create policy "lender_verification_documents_manager_select_all"
  on public.lender_verification_documents for select
  to authenticated
  using (app_private.is_manager((select auth.uid())));

grant select on public.lender_verification_documents to authenticated;
revoke insert, update, delete on public.lender_verification_documents from anon;
revoke insert, update, delete on public.lender_verification_documents from authenticated;

drop trigger if exists lender_verification_documents_set_updated_at
  on public.lender_verification_documents;
create trigger lender_verification_documents_set_updated_at
  before update on public.lender_verification_documents
  for each row execute function app_private.set_updated_at();

create or replace function app_private.enforce_lender_verification_document_owner()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile_user_id uuid;
begin
  select user_id
  into v_profile_user_id
  from public.lender_profiles
  where id = new.lender_profile_id;

  if v_profile_user_id is null
    or v_profile_user_id <> new.lender_id then
    raise exception 'Lender verification document lender mismatch.'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = new.lender_id
      and role = 'lender'
  ) then
    raise exception 'Lender verification document must reference a lender profile.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists lender_verification_documents_owner
  on public.lender_verification_documents;
create constraint trigger lender_verification_documents_owner
  after insert or update on public.lender_verification_documents
  deferrable initially immediate
  for each row execute function app_private.enforce_lender_verification_document_owner();

drop policy if exists "storage_lender_verification_documents_lender_insert"
  on storage.objects;
drop policy if exists "storage_lender_verification_documents_lender_select"
  on storage.objects;
drop policy if exists "storage_lender_verification_documents_manager_select"
  on storage.objects;

create policy "storage_lender_verification_documents_lender_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'lender-verification-documents'
    and (storage.foldername(name))[1] = 'lenders'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and (storage.foldername(name))[3] = 'verification'
    and (storage.foldername(name))[4] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and char_length(storage.filename(name)) > 0
    and exists (
      select 1
      from public.lender_profiles
      where lender_profiles.id = (storage.foldername(storage.objects.name))[4]::uuid
        and lender_profiles.user_id = (select auth.uid())
        and lender_profiles.verification_status in ('incomplete', 'pending', 'rejected')
    )
  );

create policy "storage_lender_verification_documents_lender_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'lender-verification-documents'
    and exists (
      select 1
      from public.lender_verification_documents
      where lender_verification_documents.storage_bucket = storage.objects.bucket_id
        and lender_verification_documents.storage_path = storage.objects.name
        and lender_verification_documents.lender_id = (select auth.uid())
    )
  );

create policy "storage_lender_verification_documents_manager_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'lender-verification-documents'
    and app_private.is_manager((select auth.uid()))
    and exists (
      select 1
      from public.lender_verification_documents
      where lender_verification_documents.storage_bucket = storage.objects.bucket_id
        and lender_verification_documents.storage_path = storage.objects.name
    )
  );

create or replace function app_private.submit_lender_verification_document(
  p_lender_profile_id uuid,
  p_storage_path text,
  p_document_type public.lender_verification_document_type,
  p_file_name text,
  p_file_type text,
  p_file_size integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_document_id uuid;
  v_expected_prefix text;
  v_profile public.lender_profiles%rowtype;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_approved_lender(v_actor_id)
    and not exists (
      select 1 from public.profiles
      where id = v_actor_id and role = 'lender'
    ) then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not upload verification document.'
    );
  end if;

  if p_file_size <= 0 or p_file_size > 5242880 then
    return jsonb_build_object('ok', false, 'message', 'Upload a file up to 5 MB.');
  end if;

  if p_file_type not in (
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ) then
    return jsonb_build_object(
      'ok', false,
      'message', 'Upload a JPG, PNG, WebP, or PDF file.'
    );
  end if;

  if nullif(btrim(coalesce(p_file_name, '')), '') is null
    or char_length(btrim(p_file_name)) > 240 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not save verification document.'
    );
  end if;

  select *
  into v_profile
  from public.lender_profiles
  where id = p_lender_profile_id
    and user_id = v_actor_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'Lender profile is unavailable.'
    );
  end if;

  if v_profile.verification_status = 'approved' then
    return jsonb_build_object(
      'ok', false,
      'message', 'This lender verification is already approved.'
    );
  end if;

  if v_profile.verification_status not in ('incomplete', 'pending', 'rejected') then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not upload verification document.'
    );
  end if;

  v_expected_prefix := concat(
    'lenders/',
    v_actor_id::text,
    '/verification/',
    p_lender_profile_id::text,
    '/'
  );

  if p_storage_path is null
    or p_storage_path not like v_expected_prefix || '%'
    or p_storage_path like '%//%'
    or char_length(p_storage_path) > 512 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not confirm verification document path.'
    );
  end if;

  insert into public.lender_verification_documents (
    lender_id,
    lender_profile_id,
    storage_path,
    document_type,
    file_name,
    file_type,
    file_size,
    status
  )
  values (
    v_actor_id,
    p_lender_profile_id,
    p_storage_path,
    p_document_type,
    btrim(p_file_name),
    p_file_type,
    p_file_size,
    'submitted'
  )
  returning id into v_document_id;

  if v_profile.verification_status = 'rejected' then
    update public.lender_profiles
    set
      verification_status = 'pending',
      rejected_at = null,
      rejected_by = null,
      rejection_reason = null,
      updated_at = now()
    where id = v_profile.id
      and verification_status = 'rejected';
  end if;

  perform app_private.write_audit_log(
    'lender_verification_document_uploaded',
    'lender_verification_documents',
    v_document_id,
    jsonb_build_object(
      'lender_id', v_actor_id,
      'lender_profile_id', p_lender_profile_id,
      'document_type', p_document_type
    )
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Verification document uploaded.',
    'document_id', v_document_id,
    'lender_profile_id', p_lender_profile_id
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not save verification document.'
    );
  when check_violation or foreign_key_violation then
    return jsonb_build_object(
      'ok', false,
      'message', 'Could not save verification document.'
    );
end;
$$;

create or replace function public.submit_lender_verification_document(
  p_lender_profile_id uuid,
  p_storage_path text,
  p_document_type public.lender_verification_document_type,
  p_file_name text,
  p_file_type text,
  p_file_size integer
)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.submit_lender_verification_document(
    p_lender_profile_id,
    p_storage_path,
    p_document_type,
    p_file_name,
    p_file_type,
    p_file_size
  );
$$;

create or replace function app_private.review_lender_verification_document(
  p_document_id uuid,
  p_decision text,
  p_review_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_action text;
  v_document public.lender_verification_documents%rowtype;
  v_notes text := nullif(btrim(coalesce(p_review_notes, '')), '');
  v_new_status public.lender_verification_document_status;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_manager(v_actor_id) then
    return jsonb_build_object(
      'ok', false,
      'message', 'Only managers can review verification documents.'
    );
  end if;

  if p_decision not in ('accept', 'reject') then
    return jsonb_build_object('ok', false, 'message', 'Choose accept or reject.');
  end if;

  if v_notes is not null and char_length(v_notes) > 1000 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Review notes must be 1000 characters or fewer.'
    );
  end if;

  select *
  into v_document
  from public.lender_verification_documents
  where id = p_document_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'Verification document was not found.'
    );
  end if;

  v_new_status := case
    when p_decision = 'accept' then 'accepted'::public.lender_verification_document_status
    else 'rejected'::public.lender_verification_document_status
  end;
  v_action := case
    when p_decision = 'accept' then 'lender_verification_document_accepted'
    else 'lender_verification_document_rejected'
  end;

  update public.lender_verification_documents
  set
    status = v_new_status,
    reviewed_at = now(),
    reviewed_by = v_actor_id,
    review_notes = v_notes
  where id = p_document_id
  returning * into v_document;

  perform app_private.write_audit_log(
    v_action,
    'lender_verification_documents',
    v_document.id,
    jsonb_build_object(
      'lender_id', v_document.lender_id,
      'lender_profile_id', v_document.lender_profile_id,
      'document_type', v_document.document_type,
      'document_status', v_document.status,
      'review_notes_present', v_document.review_notes is not null
    )
  );

  return jsonb_build_object(
    'ok', true,
    'message', case
      when p_decision = 'accept' then 'Verification document accepted.'
      else 'Verification document rejected.'
    end,
    'document_id', v_document.id,
    'document_status', v_document.status
  );
end;
$$;

create or replace function public.review_lender_verification_document(
  p_document_id uuid,
  p_decision text,
  p_review_notes text default null
)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.review_lender_verification_document(
    p_document_id,
    p_decision,
    p_review_notes
  );
$$;

grant execute on function app_private.submit_lender_verification_document(
  uuid,
  text,
  public.lender_verification_document_type,
  text,
  text,
  integer
) to authenticated;
grant execute on function public.submit_lender_verification_document(
  uuid,
  text,
  public.lender_verification_document_type,
  text,
  text,
  integer
) to authenticated;
grant execute on function app_private.review_lender_verification_document(uuid, text, text)
  to authenticated;
grant execute on function public.review_lender_verification_document(uuid, text, text)
  to authenticated;
