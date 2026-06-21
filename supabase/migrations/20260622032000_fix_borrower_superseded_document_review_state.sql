create or replace function app_private.trigger_borrower_sensitive_profile_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sensitive_changed boolean := false;
  v_verification_status text;
  v_verification_id uuid;
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
    or old.mobile_number is distinct from new.mobile_number
    or old.home_address is distinct from new.home_address
    or old.is_business_address_same_as_home is distinct from new.is_business_address_same_as_home
    or old.ownership_type is distinct from new.ownership_type
    or old.borrower_role is distinct from new.borrower_role
    or old.business_schedule is distinct from new.business_schedule
    or old.number_of_employees is distinct from new.number_of_employees
    or old.main_products_or_services is distinct from new.main_products_or_services
    or old.main_suppliers is distinct from new.main_suppliers
    or old.has_business_registration is distinct from new.has_business_registration
    or old.business_registration_type is distinct from new.business_registration_type
    or old.registration_number is distinct from new.registration_number
    or old.registration_date is distinct from new.registration_date
    or old.unregistered_reason is distinct from new.unregistered_reason
  then
    v_sensitive_changed := true;
  end if;

  if v_sensitive_changed then
    select id, verification_status
    into v_verification_id, v_verification_status
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
      where id = v_verification_id;

      update public.borrower_verification_documents
      set
        status = 'superseded',
        reviewed_at = null,
        reviewed_by = null,
        review_notes = null,
        updated_at = now()
      where borrower_verification_id = v_verification_id
        and document_type = any(app_private.borrower_required_verification_document_types())
        and status = 'accepted';

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

update public.borrower_verification_documents documents
set
  status = 'superseded',
  reviewed_at = null,
  reviewed_by = null,
  review_notes = null,
  updated_at = now()
from public.borrower_verifications verifications
where documents.borrower_verification_id = verifications.id
  and verifications.verification_status = 'needs_resubmission'
  and documents.document_type = any(app_private.borrower_required_verification_document_types())
  and documents.status = 'accepted';
