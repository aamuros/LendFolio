-- Manager dashboard aggregate RPCs
-- These replace full-table loads + JavaScript aggregation with server-side SQL.

CREATE OR REPLACE FUNCTION public.manager_dashboard_monthly_headcount()
RETURNS TABLE (
  month_key text,
  active_count bigint,
  pending_count bigint,
  suspended_count bigint,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    to_char(date_trunc('month', p.created_at), 'YYYY-MM') AS month_key,
    count(*) FILTER (WHERE p.status = 'active') AS active_count,
    count(*) FILTER (WHERE p.status = 'pending') AS pending_count,
    count(*) FILTER (WHERE p.status = 'suspended') AS suspended_count,
    count(*) AS total_count
  FROM profiles p
  WHERE p.created_at >= date_trunc('month', now()) - interval '11 months'
  GROUP BY date_trunc('month', p.created_at)
  ORDER BY date_trunc('month', p.created_at);
$$;

CREATE OR REPLACE FUNCTION public.manager_dashboard_status_distribution()
RETURNS TABLE (
  status text,
  count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.status::text,
    count(*) AS count
  FROM profiles p
  GROUP BY p.status;
$$;

CREATE OR REPLACE FUNCTION public.manager_dashboard_monthly_activity()
RETURNS TABLE (
  month_key text,
  applications bigint,
  offers bigint,
  loans bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', now()) - interval '11 months',
      date_trunc('month', now()),
      interval '1 month'
    ) AS month_start
  ),
  app_counts AS (
    SELECT
      date_trunc('month', la.submitted_at) AS month_start,
      count(*) AS cnt
    FROM loan_applications la
    WHERE la.submitted_at >= date_trunc('month', now()) - interval '11 months'
    GROUP BY date_trunc('month', la.submitted_at)
  ),
  offer_counts AS (
    SELECT
      date_trunc('month', lo.sent_at) AS month_start,
      count(*) AS cnt
    FROM loan_offers lo
    WHERE lo.sent_at >= date_trunc('month', now()) - interval '11 months'
    GROUP BY date_trunc('month', lo.sent_at)
  ),
  loan_counts AS (
    SELECT
      date_trunc('month', al.started_at) AS month_start,
      count(*) AS cnt
    FROM active_loans al
    WHERE al.started_at >= date_trunc('month', now()) - interval '11 months'
    GROUP BY date_trunc('month', al.started_at)
  )
  SELECT
    to_char(m.month_start, 'YYYY-MM') AS month_key,
    coalesce(a.cnt, 0) AS applications,
    coalesce(o.cnt, 0) AS offers,
    coalesce(l.cnt, 0) AS loans
  FROM months m
  LEFT JOIN app_counts a ON a.month_start = m.month_start
  LEFT JOIN offer_counts o ON o.month_start = m.month_start
  LEFT JOIN loan_counts l ON l.month_start = m.month_start
  ORDER BY m.month_start;
$$;

CREATE OR REPLACE FUNCTION public.manager_dashboard_pending_action_counts()
RETURNS TABLE (
  pending_borrower_verifications bigint,
  pending_lender_reviews bigint,
  open_applications bigint,
  pending_repayment_reviews bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM borrower_verifications
     WHERE verification_status IN ('submitted', 'under_review'))
      AS pending_borrower_verifications,
    (SELECT count(*) FROM lender_profiles
     WHERE verification_status = 'pending')
      AS pending_lender_reviews,
    (SELECT count(*) FROM loan_applications
     WHERE status IN ('submitted', 'open'))
      AS open_applications,
    (SELECT count(*) FROM repayment_proofs
     WHERE status = 'submitted')
      AS pending_repayment_reviews;
$$;

CREATE OR REPLACE FUNCTION public.manager_dashboard_lender_performance()
RETURNS TABLE (
  lender_id text,
  display_name text,
  active_loan_count bigint,
  accepted_offer_count bigint,
  business_type text,
  business_type_active_loans bigint,
  business_type_accepted_offers bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH lender_profiles_list AS (
    SELECT p.id, p.display_name
    FROM profiles p
    WHERE p.role = 'lender'
  ),
  active_loan_counts AS (
    SELECT al.lender_id, count(*) AS cnt
    FROM active_loans al
    WHERE al.status = 'active'
    GROUP BY al.lender_id
  ),
  accepted_offer_counts AS (
    SELECT lo.lender_id, count(*) AS cnt
    FROM loan_offers lo
    WHERE lo.status = 'accepted'
    GROUP BY lo.lender_id
  ),
  app_portfolio AS (
    SELECT la.id AS application_id, bp.business_type
    FROM loan_applications la
    JOIN borrower_portfolios bp ON bp.id = la.borrower_portfolio_id
  ),
  loan_business AS (
    SELECT al.lender_id, ap.business_type, count(*) AS cnt
    FROM active_loans al
    JOIN app_portfolio ap ON ap.application_id = al.loan_application_id
    WHERE al.status = 'active'
    GROUP BY al.lender_id, ap.business_type
  ),
  offer_business AS (
    SELECT lo.lender_id, ap.business_type, count(*) AS cnt
    FROM loan_offers lo
    JOIN app_portfolio ap ON ap.application_id = lo.loan_application_id
    WHERE lo.status = 'accepted'
    GROUP BY lo.lender_id, ap.business_type
  ),
  combined_business AS (
    SELECT lender_id, business_type,
           coalesce(sum(active_count), 0) AS active_count,
           coalesce(sum(accepted_count), 0) AS accepted_count
    FROM (
      SELECT lender_id, business_type, cnt AS active_count, 0 AS accepted_count FROM loan_business
      UNION ALL
      SELECT lender_id, business_type, 0, cnt FROM offer_business
    ) sub
    GROUP BY lender_id, business_type
  )
  SELECT
    lp.id::text AS lender_id,
    lp.display_name,
    coalesce(alc.cnt, 0) AS active_loan_count,
    coalesce(aoc.cnt, 0) AS accepted_offer_count,
    cb.business_type::text,
    cb.active_count AS business_type_active_loans,
    cb.accepted_count AS business_type_accepted_offers
  FROM lender_profiles_list lp
  LEFT JOIN active_loan_counts alc ON alc.lender_id = lp.id
  LEFT JOIN accepted_offer_counts aoc ON aoc.lender_id = lp.id
  LEFT JOIN combined_business cb ON cb.lender_id = lp.id
  WHERE coalesce(alc.cnt, 0) > 0 OR coalesce(aoc.cnt, 0) > 0
  ORDER BY greatest(coalesce(alc.cnt, 0), coalesce(aoc.cnt, 0)) DESC, lp.display_name;
$$;

CREATE OR REPLACE FUNCTION public.manager_dashboard_borrower_performance()
RETURNS TABLE (
  borrower_id text,
  display_name text,
  status text,
  accepted_application_count bigint,
  verified_repayment_count bigint,
  active_loan_count bigint,
  paid_loan_count bigint,
  rejected_proof_count bigint,
  overdue_defaulted_loan_count bigint,
  credit_profile_grade text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH borrower_profiles_list AS (
    SELECT p.id, p.display_name, p.status
    FROM profiles p
    WHERE p.role = 'borrower'
  ),
  accepted_app_counts AS (
    SELECT la.borrower_id, count(*) AS cnt
    FROM loan_applications la
    WHERE la.status = 'accepted'
    GROUP BY la.borrower_id
  ),
  active_loan_counts AS (
    SELECT al.borrower_id, count(*) AS cnt
    FROM active_loans al
    WHERE al.status = 'active'
    GROUP BY al.borrower_id
  ),
  paid_loan_counts AS (
    SELECT al.borrower_id, count(*) AS cnt
    FROM active_loans al
    WHERE al.status = 'paid'
    GROUP BY al.borrower_id
  ),
  overdue_defaulted_counts AS (
    SELECT al.borrower_id, count(*) AS cnt
    FROM active_loans al
    WHERE al.status IN ('overdue', 'defaulted')
    GROUP BY al.borrower_id
  ),
  verified_repayment_counts AS (
    SELECT lrs.borrower_id, count(*) AS cnt
    FROM loan_repayment_schedules lrs
    WHERE lrs.status = 'verified'
    GROUP BY lrs.borrower_id
  ),
  rejected_proof_counts AS (
    SELECT rp.borrower_id, count(*) AS cnt
    FROM repayment_proofs rp
    WHERE rp.status = 'rejected'
    GROUP BY rp.borrower_id
  ),
  has_activity AS (
    SELECT DISTINCT borrower_id FROM loan_applications
    UNION
    SELECT DISTINCT borrower_id FROM active_loans
    UNION
    SELECT DISTINCT borrower_id FROM loan_repayment_schedules
    UNION
    SELECT DISTINCT borrower_id FROM repayment_proofs
  ),
  latest_grade AS (
    SELECT DISTINCT ON (la.borrower_id)
      la.borrower_id, la.borrower_credit_profile_grade
    FROM loan_applications la
    WHERE la.borrower_credit_profile_grade IS NOT NULL
    ORDER BY la.borrower_id, la.submitted_at DESC
  )
  SELECT
    bp.id::text AS borrower_id,
    bp.display_name,
    bp.status::text,
    coalesce(aac.cnt, 0) AS accepted_application_count,
    coalesce(vrc.cnt, 0) AS verified_repayment_count,
    coalesce(alc.cnt, 0) AS active_loan_count,
    coalesce(plc.cnt, 0) AS paid_loan_count,
    coalesce(rpc.cnt, 0) AS rejected_proof_count,
    coalesce(odc.cnt, 0) AS overdue_defaulted_loan_count,
    lg.borrower_credit_profile_grade AS credit_profile_grade
  FROM borrower_profiles_list bp
  JOIN has_activity ha ON ha.borrower_id = bp.id
  LEFT JOIN accepted_app_counts aac ON aac.borrower_id = bp.id
  LEFT JOIN active_loan_counts alc ON alc.borrower_id = bp.id
  LEFT JOIN paid_loan_counts plc ON plc.borrower_id = bp.id
  LEFT JOIN overdue_defaulted_counts odc ON odc.borrower_id = bp.id
  LEFT JOIN verified_repayment_counts vrc ON vrc.borrower_id = bp.id
  LEFT JOIN rejected_proof_counts rpc ON rpc.borrower_id = bp.id
  LEFT JOIN latest_grade lg ON lg.borrower_id = bp.id
  ORDER BY bp.display_name;
$$;

-- Grant execute to authenticated role (manager RLS is enforced at the application layer)
GRANT EXECUTE ON FUNCTION public.manager_dashboard_monthly_headcount() TO authenticated;
GRANT EXECUTE ON FUNCTION public.manager_dashboard_status_distribution() TO authenticated;
GRANT EXECUTE ON FUNCTION public.manager_dashboard_monthly_activity() TO authenticated;
GRANT EXECUTE ON FUNCTION public.manager_dashboard_pending_action_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.manager_dashboard_lender_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.manager_dashboard_borrower_performance() TO authenticated;
