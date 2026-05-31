-- Wire notifications for individual borrower verification document reviews.
-- When a manager accepts or rejects a document, the borrower receives an
-- in-app notification with the document type and decision.

create or replace function app_private.review_borrower_verification_document(
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
  v_document public.borrower_verification_documents%rowtype;
  v_new_status public.borrower_verification_document_status;
  v_notes text := nullif(btrim(coalesce(p_review_notes, '')), '');
  v_doc_label text;
  v_notification_type text;
  v_notification_title text;
  v_notification_message text;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'code', 'auth_required', 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_manager(v_actor_id) then
    return jsonb_build_object('ok', false, 'code', 'not_allowed', 'message', 'Only managers can review verification documents.');
  end if;

  if p_decision not in ('accept', 'reject') then
    return jsonb_build_object('ok', false, 'code', 'invalid_decision', 'message', 'Choose accept or reject.');
  end if;

  if v_notes is not null and char_length(v_notes) > 1000 then
    return jsonb_build_object('ok', false, 'code', 'notes_too_long', 'message', 'Review notes must be 1000 characters or fewer.');
  end if;

  select *
  into v_document
  from public.borrower_verification_documents
  where id = p_document_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'Verification document was not found.');
  end if;

  if v_document.status = 'accepted' then
    return jsonb_build_object('ok', false, 'code', 'accepted_document_immutable', 'message', 'Accepted verification documents cannot be changed.');
  end if;

  v_new_status := case
    when p_decision = 'accept' then 'accepted'::public.borrower_verification_document_status
    else 'rejected'::public.borrower_verification_document_status
  end;
  v_action := case
    when p_decision = 'accept' then 'borrower_verification_document_accepted'
    else 'borrower_verification_document_rejected'
  end;

  v_doc_label := case v_document.document_type
    when 'valid_id' then 'Valid ID'
    when 'business_proof' then 'Business Proof'
    when 'address_proof' then 'Address Proof'
    when 'business_registration' then 'Business Registration'
    else 'Document'
  end;

  if p_decision = 'accept' then
    v_notification_type := 'document_accepted';
    v_notification_title := v_doc_label || ' accepted';
    v_notification_message := 'Your ' || v_doc_label || ' has been accepted by the reviewer.';
  else
    v_notification_type := 'document_rejected';
    v_notification_title := v_doc_label || ' rejected';
    v_notification_message := 'Your ' || v_doc_label || ' was rejected. Please review the feedback and resubmit.';
  end if;

  update public.borrower_verification_documents
  set
    status = v_new_status,
    reviewed_at = now(),
    reviewed_by = v_actor_id,
    review_notes = v_notes
  where id = p_document_id
  returning * into v_document;

  update public.borrower_verifications
  set
    verification_status = case
      when p_decision = 'reject' then 'needs_resubmission'::public.borrower_verification_status
      when verification_status = 'submitted' then 'under_review'::public.borrower_verification_status
      else verification_status
    end,
    submitted_at = coalesce(submitted_at, now()),
    reviewed_at = case when p_decision = 'reject' then now() else reviewed_at end,
    reviewed_by = case when p_decision = 'reject' then v_actor_id else reviewed_by end,
    rejection_reason = case
      when p_decision = 'reject' then coalesce(v_notes, 'A verification document needs to be resubmitted.')
      else rejection_reason
    end
  where id = v_document.borrower_verification_id;

  perform app_private.write_audit_log(
    v_action,
    'borrower_verification_documents',
    v_document.id,
    jsonb_build_object(
      'borrower_id', v_document.borrower_id,
      'borrower_verification_id', v_document.borrower_verification_id,
      'document_type', v_document.document_type,
      'document_status', v_document.status,
      'review_notes_present', v_document.review_notes is not null
    )
  );

  perform app_private.try_create_notification(
    v_document.borrower_id,
    v_notification_type,
    v_notification_title,
    v_notification_message,
    '/borrower?tab=profile'
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
