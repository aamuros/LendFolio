import type { Database, Json } from "@/lib/supabase/types";
import type { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildConsentStatus,
  type ConsentStatus,
  type UserConsentRecord,
} from "@/lib/consents";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

type ActiveLoanRow = Database["public"]["Tables"]["active_loans"]["Row"];
type ApplicationRow = Database["public"]["Tables"]["loan_applications"]["Row"];
type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];
type BorrowerPortfolioRow =
  Database["public"]["Tables"]["borrower_portfolios"]["Row"];
type BorrowerVerificationRow =
  Database["public"]["Tables"]["borrower_verifications"]["Row"];
type BorrowerVerificationDocumentRow =
  Database["public"]["Tables"]["borrower_verification_documents"]["Row"];
type LoanOfferRow = Database["public"]["Tables"]["loan_offers"]["Row"];
type LenderProfileRow =
  Database["public"]["Tables"]["lender_profiles"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type UserConsentRow = Database["public"]["Tables"]["user_consents"]["Row"];
type RepaymentScheduleRow =
  Database["public"]["Tables"]["loan_repayment_schedules"]["Row"];
type ManagerCountStatus =
  | Database["public"]["Enums"]["active_loan_status"]
  | Database["public"]["Enums"]["application_status"]
  | Database["public"]["Enums"]["offer_status"]
  | Database["public"]["Enums"]["borrower_verification_document_status"]
  | Database["public"]["Enums"]["repayment_proof_status"]
  | Database["public"]["Enums"]["repayment_status"];

export type ManagerOverviewMetric = {
  label: string;
  value: number;
  href: string;
};

export type ManagerProfileSummary = {
  id: string;
  displayName: string;
};

export type ManagerRepaymentScheduleSummary = {
  installmentCount: number;
  verifiedCount: number;
  submittedCount: number;
  rejectedCount: number;
  lateCount: number;
  nextDueDate: string | null;
};

export type ManagerLoanRow = {
  id: string;
  borrower: ManagerProfileSummary;
  lender: ManagerProfileSummary;
  principalAmount: number;
  repaymentAmount: number;
  outstandingBalance: number;
  status: Database["public"]["Enums"]["active_loan_status"];
  startedAt: string;
  dueDate: string;
  schedule: ManagerRepaymentScheduleSummary;
};

export type ManagerRepaymentProofRow = {
  id: string;
  fileName: string;
  proofStatus: Database["public"]["Enums"]["repayment_proof_status"];
  repaymentStatus: Database["public"]["Enums"]["repayment_status"];
  borrower: ManagerProfileSummary;
  lender: ManagerProfileSummary;
  activeLoanId: string;
  installmentNumber: number;
  amountDue: number;
  dueDate: string;
  submittedAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
};

export type ManagerAuditLogRow = {
  id: string;
  timestamp: string;
  actor: ManagerProfileSummary | null;
  action: string;
  targetTable: string;
  targetId: string;
  metadataPreview: string;
};

export type ManagerApplicationRow = {
  id: string;
  borrower: ManagerProfileSummary;
  requestedAmount: number;
  purpose: string;
  preferredTerm: Database["public"]["Enums"]["preferred_term"];
  status: Database["public"]["Enums"]["application_status"];
  submittedAt: string;
  offerCounts: Record<Database["public"]["Enums"]["offer_status"], number>;
  acceptedOffer: {
    lenderName: string;
    approvedAmount: number;
    repaymentAmount: number;
    dueDate: string;
  } | null;
};

export type ManagerLookupResult = {
  borrower: ManagerProfileSummary;
  portfolio: BorrowerPortfolioRow | null;
  applications: Array<
    ManagerApplicationRow & {
      offers: LoanOfferRow[];
      activeLoan: ManagerLoanRow | null;
    }
  >;
};

export type ManagerLenderRow = {
  id: string;
  userId: string;
  organizationName: string;
  contactPerson: string;
  phoneNumber: string;
  businessAddress: string;
  operatingArea: string;
  businessRegistrationNumber: string | null;
  minLoanAmount: number;
  maxLoanAmount: number;
  typicalRepaymentTerms: string;
  lenderDescription: string;
  verificationStatus: Database["public"]["Enums"]["lender_verification_status"];
  approvedAt: string | null;
  approvedBy: ManagerProfileSummary | null;
  managerReviewNotes: string | null;
  rejectionReason: string | null;
  rejectedAt: string | null;
  rejectedBy: ManagerProfileSummary | null;
  createdAt: string;
  updatedAt: string;
  profile: ManagerProfileSummary;
  consentStatus: ConsentStatus;
};

export type ManagerBorrowerVerificationDocumentRow = {
  id: string;
  documentType: Database["public"]["Enums"]["borrower_verification_document_type"];
  status: Database["public"]["Enums"]["borrower_verification_document_status"];
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
  viewUrl: string | null;
};

export type ManagerBorrowerVerificationRow = {
  id: string;
  borrower: ManagerProfileSummary;
  verificationStatus: Database["public"]["Enums"]["borrower_verification_status"];
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: ManagerProfileSummary | null;
  managerReviewNotes: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  documents: ManagerBorrowerVerificationDocumentRow[];
  documentUploadConsentStatus: ConsentStatus;
  loanApplicationConsentStatus: ConsentStatus;
};

const activeLoanSelect =
  "id, loan_application_id, accepted_offer_id, borrower_id, lender_id, principal_amount, repayment_amount, fees, outstanding_balance, status, started_at, due_date, created_at, updated_at";
const applicationSelect =
  "id, borrower_id, borrower_portfolio_id, requested_amount, credit_limit_at_submission, used_credit_at_submission, available_credit_at_submission, purpose, preferred_term, remarks, status, submitted_at, created_at, updated_at";
const auditLogSelect =
  "id, actor_id, action, target_table, target_id, metadata, created_at";
const offerSelect =
  "id, loan_application_id, borrower_id, lender_id, lender_name, approved_amount, repayment_amount, fees, due_date, remarks, status, sent_at, created_at, updated_at";
const portfolioSelect =
  "id, borrower_id, business_type, location, monthly_gross_revenue, monthly_expenses, existing_loan_payments, years_in_operation, loan_purpose_context, created_at, updated_at";
const profileSelect = "id, role, display_name, status, created_at, updated_at";
const lenderProfileSelect =
  "id, user_id, organization_name, contact_person, phone_number, business_address, operating_area, business_registration_number, min_loan_amount, max_loan_amount, typical_repayment_terms, lender_description, verification_status, approved_at, approved_by, manager_review_notes, rejection_reason, rejected_at, rejected_by, created_at, updated_at";
const borrowerVerificationSelect =
  "id, borrower_id, verification_status, submitted_at, reviewed_at, reviewed_by, manager_review_notes, rejection_reason, created_at, updated_at";
const borrowerVerificationDocumentSelect =
  "id, borrower_verification_id, borrower_id, storage_bucket, storage_path, document_type, file_name, file_type, file_size, status, uploaded_at, reviewed_at, reviewed_by, review_notes, created_at, updated_at";
const repaymentProofSelect =
  "id, repayment_schedule_id, active_loan_id, borrower_id, lender_id, storage_bucket, storage_path, file_name, file_type, file_size, status, submitted_at, reviewed_at, reviewed_by, review_notes, created_at, updated_at";
const repaymentScheduleSelect =
  "id, active_loan_id, borrower_id, lender_id, installment_number, amount_due, due_date, status, created_at, updated_at";

const emptyOfferCounts = {
  pending: 0,
  accepted: 0,
  declined: 0,
  expired: 0,
};

export const managerStatusLabels = {
  active: "Active",
  paid: "Paid",
  overdue: "Overdue",
  defaulted: "Defaulted",
  closed: "Closed",
  submitted: "Submitted",
  open: "Open",
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "Withdrawn",
  pending: "Pending",
  approved: "Approved",
  superseded: "Superseded",
  expired: "Expired",
  due: "Due",
  verified: "Verified",
  rejected: "Rejected",
  late: "Late",
} as const;

export const managerPreferredTermLabels = {
  "1_month": "1 month",
  "3_months": "3 months",
  "6_months": "6 months",
  "12_months": "12 months",
} as const;

export function getShortId(id: string) {
  return id.slice(0, 8);
}

export function createScheduleSummary(
  schedules: Pick<RepaymentScheduleRow, "due_date" | "status">[],
): ManagerRepaymentScheduleSummary {
  const dueSchedules = schedules
    .filter((schedule) => schedule.status !== "verified")
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  return {
    installmentCount: schedules.length,
    verifiedCount: schedules.filter((schedule) => schedule.status === "verified")
      .length,
    submittedCount: schedules.filter((schedule) => schedule.status === "submitted")
      .length,
    rejectedCount: schedules.filter((schedule) => schedule.status === "rejected")
      .length,
    lateCount: schedules.filter((schedule) => schedule.status === "late").length,
    nextDueDate: dueSchedules[0]?.due_date ?? null,
  };
}

export function createMetadataPreview(metadata: Json) {
  const value =
    typeof metadata === "string" ? metadata : JSON.stringify(metadata ?? {});

  return value.length > 180 ? `${value.slice(0, 177)}...` : value;
}

export async function loadManagerOverview(
  supabase: SupabaseServerClient,
): Promise<{ ok: boolean; message: string; metrics: ManagerOverviewMetric[] }> {
  const [
    activeLoans,
    overdueLoans,
    lateRepayments,
    paidLoans,
    submittedProofs,
    rejectedProofs,
    verifiedRepayments,
    openApplications,
    acceptedApplications,
    pendingOffers,
    pendingBorrowerVerifications,
    submittedBorrowerDocuments,
  ] = await Promise.all([
    countRows(supabase, "active_loans", { status: "active" }),
    countRows(supabase, "active_loans", { status: "overdue" }),
    countRows(supabase, "loan_repayment_schedules", { status: "late" }),
    countRows(supabase, "active_loans", { status: "paid" }),
    countRows(supabase, "repayment_proofs", { status: "submitted" }),
    countRows(supabase, "repayment_proofs", { status: "rejected" }),
    countRows(supabase, "loan_repayment_schedules", { status: "verified" }),
    countApplicationsByStatuses(supabase, ["submitted", "open"]),
    countRows(supabase, "loan_applications", { status: "accepted" }),
    countRows(supabase, "loan_offers", { status: "pending" }),
    countBorrowerVerificationsByStatus(supabase, "pending"),
    countRows(supabase, "borrower_verification_documents", { status: "submitted" }),
  ]);

  const counts = [
    activeLoans,
    overdueLoans,
    lateRepayments,
    paidLoans,
    submittedProofs,
    rejectedProofs,
    verifiedRepayments,
    openApplications,
    acceptedApplications,
    pendingOffers,
    pendingBorrowerVerifications,
    submittedBorrowerDocuments,
  ];

  return {
    ok: counts.every((count) => count.ok),
    message: counts.every((count) => count.ok)
      ? "Operations metrics loaded."
      : "Some operations metrics could not be loaded.",
    metrics: [
      { label: "Active loans", value: activeLoans.count, href: "/manager/loans?status=active" },
      {
        label: "Overdue loans",
        value: overdueLoans.count,
        href: "/manager/loans?status=overdue",
      },
      {
        label: "Late repayments",
        value: lateRepayments.count,
        href: "/manager/repayments?repaymentStatus=late",
      },
      { label: "Paid loans", value: paidLoans.count, href: "/manager/loans?status=paid" },
      {
        label: "Submitted proofs",
        value: submittedProofs.count,
        href: "/manager/repayments?proofStatus=submitted",
      },
      {
        label: "Rejected proofs",
        value: rejectedProofs.count,
        href: "/manager/repayments?proofStatus=rejected",
      },
      {
        label: "Verified repayments",
        value: verifiedRepayments.count,
        href: "/manager/repayments?repaymentStatus=verified",
      },
      {
        label: "Open/submitted applications",
        value: openApplications.count,
        href: "/manager/applications",
      },
      {
        label: "Accepted applications",
        value: acceptedApplications.count,
        href: "/manager/applications?status=accepted",
      },
      {
        label: "Pending offers",
        value: pendingOffers.count,
        href: "/manager/applications",
      },
      {
        label: "Borrower reviews",
        value: pendingBorrowerVerifications.count,
        href: "/manager/borrower-verifications?status=pending",
      },
      {
        label: "Borrower documents",
        value: submittedBorrowerDocuments.count,
        href: "/manager/borrower-verifications?documentStatus=submitted",
      },
    ],
  };
}

export async function loadManagerBorrowerVerifications(
  supabase: SupabaseServerClient,
  filters: {
    status?: string;
    documentStatus?: string;
    borrower?: string;
  } = {},
): Promise<{
  ok: boolean;
  message: string;
  verifications: ManagerBorrowerVerificationRow[];
}> {
  const borrowerIds = await resolveProfileFilterIds(
    supabase,
    filters.borrower,
    "borrower",
  );

  if (borrowerIds?.length === 0) {
    return {
      ok: true,
      message: "No borrower verifications matched these filters.",
      verifications: [],
    };
  }

  let query = supabase
    .from("borrower_verifications")
    .select(borrowerVerificationSelect)
    .order("created_at", { ascending: false })
    .limit(100);

  if (isBorrowerVerificationStatus(filters.status)) {
    query = query.eq("verification_status", filters.status);
  }
  if (borrowerIds) query = query.in("borrower_id", borrowerIds);

  const { data, error } = await query;

  if (error) {
    return {
      ok: false,
      message: "Could not load borrower verifications.",
      verifications: [],
    };
  }

  if (data.length === 0) {
    return {
      ok: true,
      message: "No borrower verifications matched these filters.",
      verifications: [],
    };
  }

  const documents = await loadBorrowerVerificationDocuments(
    supabase,
    data.map((verification) => verification.id),
    filters.documentStatus,
  );
  const visibleVerificationIds = new Set(
    [...documents.keys(), ...data.map((verification) => verification.id)].filter(
      (id) =>
        !isBorrowerVerificationDocumentStatus(filters.documentStatus) ||
        (documents.get(id)?.length ?? 0) > 0,
    ),
  );
  const filteredRows = data.filter((verification) =>
    visibleVerificationIds.has(verification.id),
  );
  const profiles = await loadProfilesByIds(
    supabase,
    filteredRows.flatMap((verification) =>
      [verification.borrower_id, verification.reviewed_by].filter(
        (id): id is string => Boolean(id),
      ),
    ),
  );
  const consents = await loadUserConsentsByUserIds(
    supabase,
    filteredRows.map((verification) => verification.borrower_id),
  );

  return {
    ok: true,
    message: filteredRows.length
      ? "Borrower verifications loaded."
      : "No borrower verifications matched these filters.",
    verifications: filteredRows.map((verification) =>
      mapManagerBorrowerVerification(
        verification,
        profiles,
        documents.get(verification.id) ?? [],
        consents.get(verification.borrower_id) ?? [],
      ),
    ),
  };
}

export async function loadManagerLoans(
  supabase: SupabaseServerClient,
  filters: {
    status?: string;
    lender?: string;
    borrower?: string;
    dueFrom?: string;
    dueTo?: string;
  },
): Promise<{ ok: boolean; message: string; loans: ManagerLoanRow[] }> {
  const lenderIds = await resolveProfileFilterIds(supabase, filters.lender, "lender");
  const borrowerIds = await resolveProfileFilterIds(
    supabase,
    filters.borrower,
    "borrower",
  );

  if (lenderIds?.length === 0 || borrowerIds?.length === 0) {
    return { ok: true, message: "No active loans matched these filters.", loans: [] };
  }

  let query = supabase
    .from("active_loans")
    .select(activeLoanSelect)
    .order("due_date", { ascending: true })
    .limit(100);

  if (isActiveLoanStatus(filters.status)) query = query.eq("status", filters.status);
  if (filters.dueFrom) query = query.gte("due_date", filters.dueFrom);
  if (filters.dueTo) query = query.lte("due_date", filters.dueTo);
  if (lenderIds) query = query.in("lender_id", lenderIds);
  if (borrowerIds) query = query.in("borrower_id", borrowerIds);

  const { data: loans, error } = await query;

  if (error) {
    return { ok: false, message: "Could not load active loans.", loans: [] };
  }

  return {
    ok: true,
    message: loans.length ? "Active loans loaded." : "No active loans matched these filters.",
    loans: await mapManagerLoans(supabase, loans),
  };
}

export async function loadManagerRepayments(
  supabase: SupabaseServerClient,
  filters: {
    proofStatus?: string;
    repaymentStatus?: string;
    lender?: string;
    borrower?: string;
    submittedFrom?: string;
    submittedTo?: string;
  },
): Promise<{ ok: boolean; message: string; proofs: ManagerRepaymentProofRow[] }> {
  const lenderIds = await resolveProfileFilterIds(supabase, filters.lender, "lender");
  const borrowerIds = await resolveProfileFilterIds(
    supabase,
    filters.borrower,
    "borrower",
  );

  if (lenderIds?.length === 0 || borrowerIds?.length === 0) {
    return {
      ok: true,
      message: "No repayment proofs matched these filters.",
      proofs: [],
    };
  }

  let query = supabase
    .from("repayment_proofs")
    .select(repaymentProofSelect)
    .order("submitted_at", { ascending: false })
    .limit(100);

  if (isProofStatus(filters.proofStatus)) query = query.eq("status", filters.proofStatus);
  if (filters.submittedFrom) query = query.gte("submitted_at", filters.submittedFrom);
  if (filters.submittedTo) query = query.lte("submitted_at", endOfDay(filters.submittedTo));
  if (lenderIds) query = query.in("lender_id", lenderIds);
  if (borrowerIds) query = query.in("borrower_id", borrowerIds);

  const { data: proofs, error } = await query;

  if (error) {
    return { ok: false, message: "Could not load repayment proofs.", proofs: [] };
  }

  if (proofs.length === 0) {
    return {
      ok: true,
      message: "No repayment proofs matched these filters.",
      proofs: [],
    };
  }

  const schedules = await loadSchedulesByIds(
    supabase,
    proofs.map((proof) => proof.repayment_schedule_id),
  );
  const filteredProofs = isRepaymentStatus(filters.repaymentStatus)
    ? proofs.filter(
        (proof) =>
          schedules.get(proof.repayment_schedule_id)?.status ===
          filters.repaymentStatus,
      )
    : proofs;
  const profiles = await loadProfilesByIds(
    supabase,
    filteredProofs.flatMap((proof) => [proof.borrower_id, proof.lender_id]),
  );

  return {
    ok: true,
    message: filteredProofs.length
      ? "Repayment proofs loaded."
      : "No repayment proofs matched these filters.",
    proofs: filteredProofs.flatMap((proof) => {
      const schedule = schedules.get(proof.repayment_schedule_id);
      if (!schedule) return [];

      return [
        {
          id: proof.id,
          fileName: proof.file_name,
          proofStatus: proof.status,
          repaymentStatus: schedule.status,
          borrower: getProfileSummary(profiles, proof.borrower_id),
          lender: getProfileSummary(profiles, proof.lender_id),
          activeLoanId: proof.active_loan_id,
          installmentNumber: schedule.installment_number,
          amountDue: schedule.amount_due,
          dueDate: schedule.due_date,
          submittedAt: proof.submitted_at,
          reviewedAt: proof.reviewed_at,
          reviewNotes: proof.review_notes,
        },
      ];
    }),
  };
}

export async function loadManagerAuditLogs(
  supabase: SupabaseServerClient,
  filters: {
    action?: string;
    targetTable?: string;
    actor?: string;
    createdFrom?: string;
    createdTo?: string;
  },
): Promise<{ ok: boolean; message: string; logs: ManagerAuditLogRow[] }> {
  const actorIds = await resolveProfileFilterIds(supabase, filters.actor);

  if (actorIds?.length === 0) {
    return { ok: true, message: "No audit logs matched these filters.", logs: [] };
  }

  let query = supabase
    .from("audit_logs")
    .select(auditLogSelect)
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters.action) query = query.ilike("action", `%${filters.action}%`);
  if (filters.targetTable) {
    query = query.ilike("target_table", `%${filters.targetTable}%`);
  }
  if (filters.createdFrom) query = query.gte("created_at", filters.createdFrom);
  if (filters.createdTo) query = query.lte("created_at", endOfDay(filters.createdTo));
  if (actorIds) query = query.in("actor_id", actorIds);

  const { data: logs, error } = await query;

  if (error) {
    return { ok: false, message: "Could not load audit logs.", logs: [] };
  }

  const profiles = await loadProfilesByIds(
    supabase,
    logs.flatMap((log) => (log.actor_id ? [log.actor_id] : [])),
  );

  return {
    ok: true,
    message: logs.length ? "Audit logs loaded." : "No audit logs matched these filters.",
    logs: logs.map((log) => mapAuditLog(log, profiles)),
  };
}

export async function loadManagerApplications(
  supabase: SupabaseServerClient,
  filters: {
    status?: string;
    borrower?: string;
    preferredTerm?: string;
    submittedFrom?: string;
    submittedTo?: string;
  },
): Promise<{ ok: boolean; message: string; applications: ManagerApplicationRow[] }> {
  const borrowerIds = await resolveProfileFilterIds(
    supabase,
    filters.borrower,
    "borrower",
  );

  if (borrowerIds?.length === 0) {
    return {
      ok: true,
      message: "No applications matched these filters.",
      applications: [],
    };
  }

  let query = supabase
    .from("loan_applications")
    .select(applicationSelect)
    .order("submitted_at", { ascending: false })
    .limit(100);

  if (isApplicationStatus(filters.status)) query = query.eq("status", filters.status);
  if (isPreferredTerm(filters.preferredTerm)) {
    query = query.eq("preferred_term", filters.preferredTerm);
  }
  if (filters.submittedFrom) query = query.gte("submitted_at", filters.submittedFrom);
  if (filters.submittedTo) query = query.lte("submitted_at", endOfDay(filters.submittedTo));
  if (borrowerIds) query = query.in("borrower_id", borrowerIds);

  const { data: applications, error } = await query;

  if (error) {
    return { ok: false, message: "Could not load applications.", applications: [] };
  }

  return {
    ok: true,
    message: applications.length
      ? "Applications loaded."
      : "No applications matched these filters.",
    applications: await mapManagerApplications(supabase, applications),
  };
}

export async function loadManagerLenders(
  supabase: SupabaseServerClient,
  filters: {
    verificationStatus?: string;
  } = {},
): Promise<{ ok: boolean; message: string; lenders: ManagerLenderRow[] }> {
  let query = supabase
    .from("lender_profiles")
    .select(lenderProfileSelect)
    .order("created_at", { ascending: false })
    .limit(100);

  if (isLenderVerificationStatus(filters.verificationStatus)) {
    query = query.eq("verification_status", filters.verificationStatus);
  }

  const { data, error } = await query;

  if (error) {
    return { ok: false, message: "Could not load lenders.", lenders: [] };
  }

  const profiles = await loadProfilesByIds(
    supabase,
    data.flatMap((lender) =>
      [lender.user_id, lender.approved_by, lender.rejected_by].filter(
        (id): id is string => Boolean(id),
      ),
    ),
  );
  const consents = await loadUserConsentsByUserIds(
    supabase,
    data.map((lender) => lender.user_id),
  );

  return {
    ok: true,
    message: data.length ? "Lenders loaded." : "No lenders found.",
    lenders: data.map((lender) =>
      mapManagerLender(lender, profiles, consents.get(lender.user_id) ?? []),
    ),
  };
}

export async function loadManagerLenderDetail(
  supabase: SupabaseServerClient,
  lenderProfileId: string,
): Promise<{ ok: boolean; message: string; lender: ManagerLenderRow | null }> {
  if (!isUuid(lenderProfileId)) {
    return { ok: false, message: "Lender profile was not found.", lender: null };
  }

  const { data, error } = await supabase
    .from("lender_profiles")
    .select(lenderProfileSelect)
    .eq("id", lenderProfileId)
    .maybeSingle();

  if (error) {
    return { ok: false, message: "Could not load lender profile.", lender: null };
  }

  if (!data) {
    return { ok: false, message: "Lender profile was not found.", lender: null };
  }

  const profiles = await loadProfilesByIds(
    supabase,
    [data.user_id, data.approved_by, data.rejected_by].filter(
      (id): id is string => Boolean(id),
    ),
  );
  const consents = await loadUserConsentsByUserIds(supabase, [data.user_id]);

  return {
    ok: true,
    message: "Lender profile loaded.",
    lender: mapManagerLender(data, profiles, consents.get(data.user_id) ?? []),
  };
}

export async function loadManagerLookup(
  supabase: SupabaseServerClient,
  search: string | undefined,
): Promise<{ ok: boolean; message: string; results: ManagerLookupResult[] }> {
  const term = search?.trim();

  if (!term) {
    return { ok: true, message: "Enter a borrower, application, location, or purpose.", results: [] };
  }

  const safeTerm = escapeFilterTerm(term);
  const applicationLookupFilter = isUuid(term)
    ? `id.eq.${safeTerm},purpose.ilike.%${safeTerm}%`
    : `purpose.ilike.%${safeTerm}%`;
  const [borrowerMatches, portfolioMatches, applicationMatches] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(profileSelect)
        .eq("role", "borrower")
        .ilike("display_name", `%${term}%`)
        .limit(25),
      supabase
        .from("borrower_portfolios")
        .select(portfolioSelect)
        .ilike("location", `%${term}%`)
        .limit(25),
      supabase
        .from("loan_applications")
        .select(applicationSelect)
        .or(applicationLookupFilter)
        .limit(25),
    ]);

  if (borrowerMatches.error || portfolioMatches.error || applicationMatches.error) {
    return { ok: false, message: "Could not run lookup.", results: [] };
  }

  const borrowerIds = new Set<string>();

  borrowerMatches.data.forEach((profile) => borrowerIds.add(profile.id));
  portfolioMatches.data.forEach((portfolio) => borrowerIds.add(portfolio.borrower_id));
  applicationMatches.data.forEach((application) =>
    borrowerIds.add(application.borrower_id),
  );

  if (isUuid(term)) borrowerIds.add(term);

  if (borrowerIds.size === 0) {
    return { ok: true, message: "No matching records found.", results: [] };
  }

  const ids = [...borrowerIds];
  const [profilesResult, portfoliosResult, applicationsResult] = await Promise.all([
    supabase.from("profiles").select(profileSelect).in("id", ids),
    supabase.from("borrower_portfolios").select(portfolioSelect).in("borrower_id", ids),
    supabase
      .from("loan_applications")
      .select(applicationSelect)
      .in("borrower_id", ids)
      .order("submitted_at", { ascending: false }),
  ]);

  if (profilesResult.error || portfoliosResult.error || applicationsResult.error) {
    return { ok: false, message: "Could not load lookup results.", results: [] };
  }

  const applications = applicationsResult.data;
  const mappedApplications = await mapManagerApplications(supabase, applications);
  const offersByApplicationId = await loadOffersByApplicationIds(
    supabase,
    applications.map((application) => application.id),
  );
  const loansByApplicationId = await loadLoansByApplicationIds(
    supabase,
    applications.map((application) => application.id),
  );
  const portfoliosByBorrowerId = new Map(
    portfoliosResult.data.map((portfolio) => [portfolio.borrower_id, portfolio]),
  );
  const applicationRowsById = new Map(
    applications.map((application) => [application.id, application]),
  );

  return {
    ok: true,
    message: "Lookup results loaded.",
    results: profilesResult.data.map((profile) => ({
      borrower: toProfileSummary(profile),
      portfolio: portfoliosByBorrowerId.get(profile.id) ?? null,
      applications: mappedApplications
        .filter((application) => applicationRowsById.get(application.id)?.borrower_id === profile.id)
        .map((application) => ({
          ...application,
          offers: offersByApplicationId.get(application.id) ?? [],
          activeLoan: loansByApplicationId.get(application.id) ?? null,
        })),
    })),
  };
}

async function mapManagerLoans(
  supabase: SupabaseServerClient,
  loans: ActiveLoanRow[],
) {
  const profiles = await loadProfilesByIds(
    supabase,
    loans.flatMap((loan) => [loan.borrower_id, loan.lender_id]),
  );
  const schedules = await loadSchedulesByLoanIds(
    supabase,
    loans.map((loan) => loan.id),
  );

  return loans.map((loan) => ({
    id: loan.id,
    borrower: getProfileSummary(profiles, loan.borrower_id),
    lender: getProfileSummary(profiles, loan.lender_id),
    principalAmount: loan.principal_amount,
    repaymentAmount: loan.repayment_amount,
    outstandingBalance: loan.outstanding_balance,
    status: loan.status,
    startedAt: loan.started_at,
    dueDate: loan.due_date,
    schedule: createScheduleSummary(schedules.get(loan.id) ?? []),
  }));
}

async function mapManagerApplications(
  supabase: SupabaseServerClient,
  applications: ApplicationRow[],
): Promise<ManagerApplicationRow[]> {
  const [profiles, offersByApplicationId] = await Promise.all([
    loadProfilesByIds(
      supabase,
      applications.map((application) => application.borrower_id),
    ),
    loadOffersByApplicationIds(
      supabase,
      applications.map((application) => application.id),
    ),
  ]);

  return applications.map((application) => {
    const offers = offersByApplicationId.get(application.id) ?? [];
    const acceptedOffer = offers.find((offer) => offer.status === "accepted");

    return {
      id: application.id,
      borrower: getProfileSummary(profiles, application.borrower_id),
      requestedAmount: application.requested_amount,
      purpose: application.purpose,
      preferredTerm: application.preferred_term,
      status: application.status,
      submittedAt: application.submitted_at,
      offerCounts: offers.reduce(
        (counts, offer) => ({
          ...counts,
          [offer.status]: counts[offer.status] + 1,
        }),
        { ...emptyOfferCounts },
      ),
      acceptedOffer: acceptedOffer
        ? {
            lenderName: acceptedOffer.lender_name,
            approvedAmount: acceptedOffer.approved_amount,
            repaymentAmount: acceptedOffer.repayment_amount,
            dueDate: acceptedOffer.due_date,
          }
        : null,
    };
  });
}

async function loadLoansByApplicationIds(
  supabase: SupabaseServerClient,
  applicationIds: string[],
) {
  if (applicationIds.length === 0) return new Map<string, ManagerLoanRow>();

  const { data, error } = await supabase
    .from("active_loans")
    .select(activeLoanSelect)
    .in("loan_application_id", applicationIds);

  if (error || data.length === 0) return new Map<string, ManagerLoanRow>();

  const mappedLoans = await mapManagerLoans(supabase, data);
  return data.reduce((groups, loan, index) => {
    groups.set(loan.loan_application_id, mappedLoans[index]);
    return groups;
  }, new Map<string, ManagerLoanRow>());
}

async function loadOffersByApplicationIds(
  supabase: SupabaseServerClient,
  applicationIds: string[],
) {
  if (applicationIds.length === 0) return new Map<string, LoanOfferRow[]>();

  const { data, error } = await supabase
    .from("loan_offers")
    .select(offerSelect)
    .in("loan_application_id", applicationIds)
    .order("sent_at", { ascending: false });

  if (error) return new Map<string, LoanOfferRow[]>();

  return data.reduce((groups, offer) => {
    groups.set(offer.loan_application_id, [
      ...(groups.get(offer.loan_application_id) ?? []),
      offer,
    ]);
    return groups;
  }, new Map<string, LoanOfferRow[]>());
}

async function loadBorrowerVerificationDocuments(
  supabase: SupabaseServerClient,
  verificationIds: string[],
  status?: string,
) {
  const uniqueIds = [...new Set(verificationIds)];
  if (uniqueIds.length === 0) {
    return new Map<string, ManagerBorrowerVerificationDocumentRow[]>();
  }

  let query = supabase
    .from("borrower_verification_documents")
    .select(borrowerVerificationDocumentSelect)
    .in("borrower_verification_id", uniqueIds)
    .order("uploaded_at", { ascending: false });

  if (isBorrowerVerificationDocumentStatus(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error || data.length === 0) {
    return new Map<string, ManagerBorrowerVerificationDocumentRow[]>();
  }

  const mappedDocuments = await Promise.all(
    data.map(async (document) => ({
      borrowerVerificationId: document.borrower_verification_id,
      document: await mapManagerBorrowerVerificationDocument(supabase, document),
    })),
  );

  return mappedDocuments.reduce((groups, item) => {
    groups.set(item.borrowerVerificationId, [
      ...(groups.get(item.borrowerVerificationId) ?? []),
      item.document,
    ]);

    return groups;
  }, new Map<string, ManagerBorrowerVerificationDocumentRow[]>());
}

async function mapManagerBorrowerVerificationDocument(
  supabase: SupabaseServerClient,
  document: BorrowerVerificationDocumentRow,
): Promise<ManagerBorrowerVerificationDocumentRow> {
  const { data } = await supabase.storage
    .from(document.storage_bucket)
    .createSignedUrl(document.storage_path, 300);

  return {
    id: document.id,
    documentType: document.document_type,
    status: document.status,
    fileName: document.file_name,
    fileType: document.file_type,
    fileSize: document.file_size,
    uploadedAt: document.uploaded_at,
    reviewedAt: document.reviewed_at,
    reviewNotes: document.review_notes,
    viewUrl: data?.signedUrl ?? null,
  };
}

function mapManagerBorrowerVerification(
  verification: BorrowerVerificationRow,
  profiles: Map<string, ProfileRow>,
  documents: ManagerBorrowerVerificationDocumentRow[],
  consents: UserConsentRecord[],
): ManagerBorrowerVerificationRow {
  return {
    id: verification.id,
    borrower: getProfileSummary(profiles, verification.borrower_id),
    verificationStatus: verification.verification_status,
    submittedAt: verification.submitted_at,
    reviewedAt: verification.reviewed_at,
    reviewedBy: verification.reviewed_by
      ? getProfileSummary(profiles, verification.reviewed_by)
      : null,
    managerReviewNotes: verification.manager_review_notes,
    rejectionReason: verification.rejection_reason,
    createdAt: verification.created_at,
    updatedAt: verification.updated_at,
    documents,
    documentUploadConsentStatus: buildConsentStatus(
      "borrower_document_upload",
      consents,
    ),
    loanApplicationConsentStatus: buildConsentStatus(
      "borrower_loan_application",
      consents,
    ),
  };
}

async function loadUserConsentsByUserIds(
  supabase: SupabaseServerClient,
  userIds: string[],
) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map<string, UserConsentRecord[]>();

  const { data, error } = await supabase
    .from("user_consents")
    .select("user_id, consent_type, version, accepted_at")
    .in("user_id", uniqueIds)
    .order("accepted_at", { ascending: false });

  if (error) return new Map<string, UserConsentRecord[]>();

  return data.reduce((groups, consent: Pick<UserConsentRow, "user_id" | "consent_type" | "version" | "accepted_at">) => {
    const current = groups.get(consent.user_id) ?? [];
    groups.set(consent.user_id, [
      ...current,
      {
        consentType: consent.consent_type,
        version: consent.version,
        acceptedAt: consent.accepted_at,
      },
    ]);
    return groups;
  }, new Map<string, UserConsentRecord[]>());
}

async function loadProfilesByIds(
  supabase: SupabaseServerClient,
  ids: string[],
) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map<string, ProfileRow>();

  const { data, error } = await supabase
    .from("profiles")
    .select(profileSelect)
    .in("id", uniqueIds);

  if (error) return new Map<string, ProfileRow>();

  return new Map(data.map((profile) => [profile.id, profile]));
}

async function loadSchedulesByLoanIds(
  supabase: SupabaseServerClient,
  loanIds: string[],
) {
  if (loanIds.length === 0) return new Map<string, RepaymentScheduleRow[]>();

  const { data, error } = await supabase
    .from("loan_repayment_schedules")
    .select(repaymentScheduleSelect)
    .in("active_loan_id", loanIds)
    .order("installment_number", { ascending: true });

  if (error) return new Map<string, RepaymentScheduleRow[]>();

  return data.reduce((groups, schedule) => {
    groups.set(schedule.active_loan_id, [
      ...(groups.get(schedule.active_loan_id) ?? []),
      schedule,
    ]);
    return groups;
  }, new Map<string, RepaymentScheduleRow[]>());
}

async function loadSchedulesByIds(
  supabase: SupabaseServerClient,
  scheduleIds: string[],
) {
  const uniqueIds = [...new Set(scheduleIds)];
  if (uniqueIds.length === 0) return new Map<string, RepaymentScheduleRow>();

  const { data, error } = await supabase
    .from("loan_repayment_schedules")
    .select(repaymentScheduleSelect)
    .in("id", uniqueIds);

  if (error) return new Map<string, RepaymentScheduleRow>();

  return new Map(data.map((schedule) => [schedule.id, schedule]));
}

async function resolveProfileFilterIds(
  supabase: SupabaseServerClient,
  search: string | undefined,
  role?: Database["public"]["Enums"]["app_role"],
) {
  const term = search?.trim();
  if (!term) return null;

  let query = supabase
    .from("profiles")
    .select("id")
    .ilike("display_name", `%${term}%`)
    .limit(50);

  if (role) query = query.eq("role", role);

  const { data, error } = await query;

  if (error) return [];

  const ids = new Set(data.map((profile) => profile.id));
  if (isUuid(term)) ids.add(term);

  return [...ids];
}

function getProfileSummary(
  profiles: Map<string, ProfileRow>,
  id: string,
): ManagerProfileSummary {
  const profile = profiles.get(id);

  return profile ? toProfileSummary(profile) : { id, displayName: `User ${getShortId(id)}` };
}

function toProfileSummary(profile: ProfileRow): ManagerProfileSummary {
  return { id: profile.id, displayName: profile.display_name };
}

function mapAuditLog(
  log: AuditLogRow,
  profiles: Map<string, ProfileRow>,
): ManagerAuditLogRow {
  return {
    id: log.id,
    timestamp: log.created_at,
    actor: log.actor_id ? getProfileSummary(profiles, log.actor_id) : null,
    action: log.action,
    targetTable: log.target_table,
    targetId: log.target_id,
    metadataPreview: createMetadataPreview(log.metadata),
  };
}

function mapManagerLender(
  lender: LenderProfileRow,
  profiles: Map<string, ProfileRow>,
  consents: UserConsentRecord[],
): ManagerLenderRow {
  return {
    id: lender.id,
    userId: lender.user_id,
    organizationName: lender.organization_name,
    contactPerson: lender.contact_person,
    phoneNumber: lender.phone_number,
    businessAddress: lender.business_address,
    operatingArea: lender.operating_area,
    businessRegistrationNumber: lender.business_registration_number,
    minLoanAmount: Number(lender.min_loan_amount),
    maxLoanAmount: Number(lender.max_loan_amount),
    typicalRepaymentTerms: lender.typical_repayment_terms,
    lenderDescription: lender.lender_description,
    verificationStatus: lender.verification_status,
    approvedAt: lender.approved_at,
    approvedBy: lender.approved_by
      ? getProfileSummary(profiles, lender.approved_by)
      : null,
    managerReviewNotes: lender.manager_review_notes,
    rejectionReason: lender.rejection_reason,
    rejectedAt: lender.rejected_at,
    rejectedBy: lender.rejected_by
      ? getProfileSummary(profiles, lender.rejected_by)
      : null,
    createdAt: lender.created_at,
    updatedAt: lender.updated_at,
    profile: getProfileSummary(profiles, lender.user_id),
    consentStatus: buildConsentStatus("lender_review", consents),
  };
}

function isLenderVerificationStatus(
  value: string | undefined,
): value is Database["public"]["Enums"]["lender_verification_status"] {
  return value === "pending" || value === "approved" || value === "rejected";
}

async function countRows(
  supabase: SupabaseServerClient,
  table:
    | "active_loans"
    | "borrower_verification_documents"
    | "loan_applications"
    | "loan_offers"
    | "loan_repayment_schedules"
    | "repayment_proofs",
  filter: { status: ManagerCountStatus },
) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("status", filter.status);

  return { ok: !error, count: count ?? 0 };
}

async function countBorrowerVerificationsByStatus(
  supabase: SupabaseServerClient,
  status: Database["public"]["Enums"]["borrower_verification_status"],
) {
  const { count, error } = await supabase
    .from("borrower_verifications")
    .select("id", { count: "exact", head: true })
    .eq("verification_status", status);

  return { ok: !error, count: count ?? 0 };
}

async function countApplicationsByStatuses(
  supabase: SupabaseServerClient,
  statuses: Database["public"]["Enums"]["application_status"][],
) {
  const { count, error } = await supabase
    .from("loan_applications")
    .select("id", { count: "exact", head: true })
    .in("status", statuses);

  return { ok: !error, count: count ?? 0 };
}

function endOfDay(date: string) {
  return `${date}T23:59:59.999Z`;
}

function escapeFilterTerm(value: string) {
  return value.replace(/[%(),]/g, "");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isActiveLoanStatus(
  value: string | undefined,
): value is Database["public"]["Enums"]["active_loan_status"] {
  return ["active", "paid", "overdue", "defaulted", "closed"].includes(value ?? "");
}

function isApplicationStatus(
  value: string | undefined,
): value is Database["public"]["Enums"]["application_status"] {
  return ["submitted", "open", "accepted", "declined", "withdrawn"].includes(
    value ?? "",
  );
}

function isPreferredTerm(
  value: string | undefined,
): value is Database["public"]["Enums"]["preferred_term"] {
  return ["1_month", "3_months", "6_months", "12_months"].includes(value ?? "");
}

function isProofStatus(
  value: string | undefined,
): value is Database["public"]["Enums"]["repayment_proof_status"] {
  return ["submitted", "verified", "rejected"].includes(value ?? "");
}

function isBorrowerVerificationStatus(
  value: string | undefined,
): value is Database["public"]["Enums"]["borrower_verification_status"] {
  return ["pending", "approved", "rejected"].includes(value ?? "");
}

function isBorrowerVerificationDocumentStatus(
  value: string | undefined,
): value is Database["public"]["Enums"]["borrower_verification_document_status"] {
  return ["submitted", "accepted", "rejected", "superseded"].includes(value ?? "");
}

function isRepaymentStatus(
  value: string | undefined,
): value is Database["public"]["Enums"]["repayment_status"] {
  return ["due", "submitted", "verified", "rejected", "late"].includes(value ?? "");
}
