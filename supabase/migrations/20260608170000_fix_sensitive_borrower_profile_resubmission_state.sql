create or replace function app_private.trigger_borrower_sensitive_profile_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sensitive_changed boolean := false;
  v_verification_status text;
  v_reason text := 'Sensitive profile details changed. Please resubmit verification documents.';
begin
  if old.business_name is distinct from new.business_name
    or old.business_type is distinct from new.business_type
    or old.business_address is distinct from new.business_address
    or old.location is distinct from new.location
    or old.barangay is distinct from new.barangay
    or old.city_or_municipality is distinct from new.city_or_municipality
    or old.province is distinct from new.province
    or old.operating_model is distinct from new.operating_model
  then
    v_sensitive_changed := true;
  end if;

  if v_sensitive_changed then
    select verification_status
    into v_verification_status
    from public.borrower_verifications
    where borrower_id = new.borrower_id;

    if v_verification_status = 'approved' then
      update public.borrower_verifications
      set
        verification_status = 'needs_resubmission',
        submitted_at = coalesce(submitted_at, now()),
        reviewed_at = now(),
        reviewed_by = new.borrower_id,
        manager_review_notes = v_reason,
        rejection_reason = v_reason
      where borrower_id = new.borrower_id;

      perform app_private.write_audit_log(
        'borrower_verification_needs_resubmission',
        'borrower_verifications',
        new.borrower_id,
        jsonb_build_object(
          'borrower_id', new.borrower_id,
          'reason', 'sensitive_profile_change'
        )
      );
    end if;
  end if;

  return new;
end;
$$;
