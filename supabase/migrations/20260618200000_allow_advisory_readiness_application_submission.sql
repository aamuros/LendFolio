create or replace function app_private.borrower_application_readiness(
  p_borrower_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles%rowtype;
  v_verification public.borrower_verifications%rowtype;
  v_document_policy jsonb;
  v_profile_readiness jsonb;
  v_profile_status text;
  v_codes text[] := array[]::text[];
  v_readiness_status public.borrower_credit_readiness_status;
begin
  select * into v_profile
  from public.profiles
  where id = p_borrower_id
    and role = 'borrower';

  if not found then
    return jsonb_build_object(
      'ok', false,
      'application_ready', false,
      'readiness_status', 'incomplete',
      'codes', jsonb_build_array('profile_required'),
      'primary_code', 'profile_required',
      'message', 'Complete your borrower profile before applying.'
    );
  end if;

  if v_profile.status <> 'active' then
    v_codes := array_append(
      v_codes,
      case when v_profile.status = 'suspended' then 'suspended' else 'account_not_active' end
    );
  end if;

  v_profile_readiness := app_private.borrower_profile_readiness(p_borrower_id);
  v_profile_status := v_profile_readiness->>'readiness_status';

  if v_profile_status = 'incomplete' then
    v_codes := array_append(v_codes, 'profile_incomplete');
  elsif v_profile_status = 'not_eligible' then
    v_codes := array_append(v_codes, 'not_eligible');
  end if;

  if not app_private.has_borrower_loan_application_consents(p_borrower_id) then
    v_codes := array_append(v_codes, 'consent_required');
  end if;

  select * into v_verification
  from public.borrower_verifications
  where borrower_id = p_borrower_id;

  if not found or v_verification.verification_status <> 'approved' then
    v_codes := array_append(v_codes, 'borrower_verification_required');
  end if;

  v_document_policy := app_private.borrower_verification_document_policy(p_borrower_id);

  if not coalesce((v_document_policy->>'documents_accepted')::boolean, false) then
    v_codes := array_append(v_codes, 'documents_required');
  end if;

  v_readiness_status := case
    when cardinality(v_codes) = 0 and v_profile_status = 'needs_review'
      then 'needs_review'::public.borrower_credit_readiness_status
    when cardinality(v_codes) = 0
      then 'eligible_to_apply'::public.borrower_credit_readiness_status
    else coalesce(v_profile_status, 'incomplete')::public.borrower_credit_readiness_status
  end;

  return jsonb_build_object(
    'ok', cardinality(v_codes) = 0,
    'application_ready', cardinality(v_codes) = 0,
    'readiness_status', v_readiness_status,
    'codes', to_jsonb(v_codes),
    'primary_code', case when cardinality(v_codes) = 0 then null else v_codes[1] end,
    'profile_complete', v_profile_status in ('complete', 'eligible_to_apply', 'needs_review'),
    'profile_readiness', v_profile_readiness,
    'account_status', v_profile.status,
    'borrower_verification_status', v_verification.verification_status,
    'document_policy', v_document_policy,
    'message', case
      when cardinality(v_codes) = 0 and v_profile_status = 'needs_review' then 'Application ready. Lenders may review some profile details.'
      when cardinality(v_codes) = 0 then 'Application ready.'
      when v_codes[1] = 'profile_incomplete' then 'Complete your business profile before submitting an application.'
      when v_codes[1] = 'not_eligible' then 'Your current profile is not eligible to apply.'
      when v_codes[1] = 'consent_required' then 'Accept the required disclosures before submitting an application.'
      when v_codes[1] = 'borrower_verification_required' then 'Borrower verification is required before submitting a loan application.'
      when v_codes[1] = 'documents_required' then 'Upload and complete review for the required verification documents.'
      when v_codes[1] = 'suspended' then 'This account is suspended.'
      else 'This account is not active.'
    end
  );
end;
$$;
