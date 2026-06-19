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
      when cardinality(v_codes) = 0 and v_profile_status = 'needs_review'
        then 'Application ready with profile review flags.'
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

create or replace function app_private.submit_loan_application(
  p_requested_amount numeric,
  p_purpose text,
  p_preferred_term public.preferred_term,
  p_remarks text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_application record;
  v_credit jsonb;
  v_portfolio public.borrower_portfolios%rowtype;
  v_readiness jsonb;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'code', 'auth_required', 'message', 'Sign in to continue.');
  end if;

  if not app_private.is_borrower(v_actor_id) then
    return jsonb_build_object('ok', false, 'code', 'not_allowed', 'message', 'Could not submit application.');
  end if;

  v_readiness := app_private.borrower_application_readiness(v_actor_id);
  perform app_private.write_audit_log(
    'borrower_readiness_evaluated',
    'profiles',
    v_actor_id,
    jsonb_build_object(
      'borrower_id', v_actor_id,
      'readiness_status', v_readiness->>'readiness_status',
      'codes', v_readiness->'codes',
      'risk_flags', v_readiness->'profile_readiness'->'risk_flags'
    )
  );

  if not coalesce((v_readiness->>'application_ready')::boolean, false) then
    return jsonb_build_object(
      'ok', false,
      'code', v_readiness->>'primary_code',
      'codes', v_readiness->'codes',
      'message', v_readiness->>'message',
      'readiness', v_readiness
    );
  end if;

  if p_requested_amount is null
    or p_requested_amount < 1000
    or p_requested_amount > 1000000 then
    return jsonb_build_object('ok', false, 'code', 'invalid_amount', 'message', 'Review the highlighted fields before submitting.');
  end if;

  if p_purpose is null
    or char_length(btrim(p_purpose)) < 10
    or char_length(btrim(p_purpose)) > 160 then
    return jsonb_build_object('ok', false, 'code', 'invalid_purpose', 'message', 'Review the highlighted fields before submitting.');
  end if;

  if p_preferred_term is null then
    return jsonb_build_object('ok', false, 'code', 'invalid_term', 'message', 'Review the highlighted fields before submitting.');
  end if;

  if p_remarks is not null and char_length(btrim(p_remarks)) > 500 then
    return jsonb_build_object('ok', false, 'code', 'invalid_remarks', 'message', 'Review the highlighted fields before submitting.');
  end if;

  perform pg_advisory_xact_lock(hashtext(v_actor_id::text));

  select * into v_portfolio
  from public.borrower_portfolios
  where borrower_id = v_actor_id;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'profile_required', 'message', 'Save your business profile before submitting an application.');
  end if;

  v_credit := app_private.calculate_borrower_credit_limit_details(
    v_portfolio.monthly_gross_revenue,
    v_portfolio.monthly_expenses,
    v_portfolio.existing_loan_payments,
    v_portfolio.years_in_operation,
    v_actor_id
  );

  if p_requested_amount > (v_credit->>'available_credit')::numeric then
    return jsonb_build_object(
      'ok', false,
      'code', 'credit_limit_exceeded',
      'message', 'Requested amount exceeds your available credit.',
      'credit_limit', (v_credit->>'calculated_credit_limit')::numeric,
      'used_credit', (v_credit->>'used_credit')::numeric,
      'available_credit', (v_credit->>'available_credit')::numeric
    );
  end if;

  insert into public.loan_applications (
    borrower_id,
    borrower_portfolio_id,
    requested_amount,
    purpose,
    preferred_term,
    remarks,
    status,
    credit_limit_at_submission,
    used_credit_at_submission,
    available_credit_at_submission,
    monthly_net_cash_flow_at_submission,
    credit_readiness_status,
    borrower_profile_snapshot,
    borrower_readiness_snapshot
  )
  values (
    v_actor_id,
    v_portfolio.id,
    round(p_requested_amount, 2),
    btrim(p_purpose),
    p_preferred_term,
    nullif(btrim(coalesce(p_remarks, '')), ''),
    'submitted',
    round((v_credit->>'calculated_credit_limit')::numeric, 2),
    round((v_credit->>'used_credit')::numeric, 2),
    round((v_credit->>'available_credit')::numeric, 2),
    round((v_credit->>'monthly_net_cash_flow')::numeric, 2),
    coalesce(nullif(v_readiness->>'readiness_status', ''), 'eligible_to_apply')::public.borrower_credit_readiness_status,
    to_jsonb(v_portfolio),
    v_readiness
  )
  returning id, borrower_id, borrower_portfolio_id, requested_amount, purpose,
    preferred_term, remarks, status, submitted_at, created_at, updated_at,
    credit_limit_at_submission, used_credit_at_submission,
    available_credit_at_submission, monthly_net_cash_flow_at_submission,
    credit_readiness_status, borrower_profile_snapshot, borrower_readiness_snapshot
  into v_application;

  perform app_private.write_audit_log(
    'loan_application_submitted_with_profile_snapshot',
    'loan_applications',
    v_application.id,
    jsonb_build_object(
      'borrower_id', v_actor_id,
      'credit_readiness_status', v_application.credit_readiness_status,
      'risk_flags', v_readiness->'profile_readiness'->'risk_flags',
      'available_credit', v_application.available_credit_at_submission
    )
  );

  perform app_private.try_create_notification(
    lender_profiles.user_id,
    'application_submitted',
    'New loan application',
    'A borrower submitted a new loan application for review.',
    '/lender/applications/' || v_application.id::text
  )
  from public.lender_profiles
  where lender_profiles.verification_status = 'approved';

  return jsonb_build_object(
    'ok', true,
    'message', 'Application submitted.',
    'application', to_jsonb(v_application),
    'credit_limit', (v_credit->>'calculated_credit_limit')::numeric,
    'used_credit', (v_credit->>'used_credit')::numeric,
    'available_credit', (v_credit->>'available_credit')::numeric
  );
exception
  when check_violation or not_null_violation then
    return jsonb_build_object('ok', false, 'code', 'invalid_application', 'message', 'Review the highlighted fields before submitting.');
  when raise_exception then
    return jsonb_build_object('ok', false, 'code', 'credit_limit_exceeded', 'message', sqlerrm);
end;
$$;
