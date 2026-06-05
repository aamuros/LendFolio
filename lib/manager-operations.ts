import type { Database, Json } from "@/lib/supabase/types";
import type { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  calculateBorrowerVerificationDocumentPolicy,
  type BorrowerVerificationDocumentPolicy,
} from "./borrower-verification";
import {
  calculateLenderVerificationDocumentPolicy,
  type LenderVerificationDocumentPolicy,
  type LenderVerificationDocumentType,
  type LenderVerificationDocumentStatus,
} from "./lender-verification";
import {
  buildConsentStatus,
  type ConsentStatus,
} from "./consents";
import { loadUserConsents } from "./user-consents";
import { isUuid } from "./validation/uuid";
import { deriveInterestAmount } from "./loan-offer";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

type ActiveLoanRow = Database["public"]["Tables"]["active_loans"]["Row"];
type ApplicationRow = Database["public"]["Tables"]["loan_applications"]["Row"];
type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];
type BorrowerPortfolioRow =
  Database["public"]["Tables"]["borrower_portfolios"]["Row"];
type LenderProfileRow = Database["public"]["Tables"]["lender_profiles"]["Row"];
export type LoanOfferRow = Database["public"]["Tables"]["loan_offers"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type RepaymentScheduleRow =
  Database["public"]["Tables"]["loan_repayment_schedules"]["Row"];
type ManagerCountStatus =
  | Database["public"]["Enums"]["active_loan_status"]
  | Database["public"]["Enums"]["application_status"]
  | Database["public"]["Enums"]["offer_status"]
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
  nextDueDate: string | null;
};

export type ManagerLoanRow = {
  id: string;
  borrower: ManagerProfileSummary;
  lender: ManagerProfileSummary;
  principalAmount: number;
  repaymentAmount: number;
  totalRepaymentAmount: number;
  fees: number;
  interestAmount: number;
  outstandingBalance: number;
  status: Database["public"]["Enums"]["active_loan_status"];
  startedAt: string | null;
  dueDate: string | null;
  schedule: ManagerRepaymentScheduleSummary;
};

export type ManagerLoanDetail = ManagerLoanRow & {
  repaymentSchedules: Array<{
    id: string;
    installmentNumber: number;
    amountDue: number;
    dueDate: string;
    status: Database["public"]["Enums"]["repayment_status"];
  }>;
  repaymentProofs: ManagerRepaymentProofRow[];
};

export type ManagerRepaymentProofRow = {
  id: string;
  fileName: string;
  fileType: string | null;
  fileSize: number | null;
  storageBucket: string;
  storagePath: string;
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

export type ManagerBorrowerUserDetail = Extract<
  ManagerUserDirectoryRow,
  { role: "borrower" }
> & {
  portfolio: BorrowerPortfolioRow | null;
  applications: Array<
    ManagerApplicationRow & {
      activeLoan: ManagerLoanRow | null;
    }
  >;
  activeLoans: ManagerLoanRow[];
};

export type ManagerLenderUserDetail = Extract<
  ManagerUserDirectoryRow,
  { role: "lender" }
> & {
  lenderProfile: LenderProfileRow | null;
  offers: LoanOfferRow[];
  activeLoans: ManagerLoanRow[];
  submittedProofs: ManagerRepaymentProofRow[];
};

export type ManagerProfileUserDetail = Extract<
  ManagerUserDirectoryRow,
  { role: "manager" }
>;

export type ManagerUserDetail =
  | ManagerBorrowerUserDetail
  | ManagerLenderUserDetail
  | ManagerProfileUserDetail;

export type ManagerUserDetailLoadResult =
  | {
      ok: true;
      mode: "loaded";
      message: string;
      user: ManagerUserDetail;
    }
  | {
      ok: false;
      mode: "partial";
      message: string;
      user: ManagerUserDetail;
    }
  | {
      ok: false;
      mode: "invalid-id" | "not-found" | "supabase";
      message: string;
      user: null;
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

export type ManagerAuditLogDetail = ManagerAuditLogRow & {
  metadata: Json;
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
    fees: number;
    interestAmount: number;
    totalRepaymentAmount: number;
    dueDate: string;
  } | null;
};

export type ManagerApplicationDetail = ManagerApplicationRow & {
  offers: LoanOfferRow[];
  activeLoan: ManagerLoanRow | null;
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

export type ManagerUserDirectoryRow =
  | {
      role: "borrower";
      profile: ManagerProfileSummary;
      status: Database["public"]["Enums"]["profile_status"];
      portfolioLocation: string | null;
      applicationCount: number;
      activeLoanCount: number;
      latestApplicationStatus:
        | Database["public"]["Enums"]["application_status"]
        | null;
    }
  | {
      role: "lender";
      profile: ManagerProfileSummary;
      status: Database["public"]["Enums"]["profile_status"];
      organizationName: string | null;
      verificationStatus:
        | Database["public"]["Enums"]["lender_verification_status"]
        | null;
      offerCount: number;
      acceptedOfferCount: number;
      activeLoanCount: number;
      submittedProofCount: number;
    }
  | {
      role: "manager";
      profile: ManagerProfileSummary;
      status: Database["public"]["Enums"]["profile_status"];
    };

export type ManagerLenderRow = {
  id: string;
  userId: string;
  profile: ManagerProfileSummary;
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
  rejectedAt: string | null;
  rejectedBy: ManagerProfileSummary | null;
  managerReviewNotes: string | null;
  rejectionReason: string | null;
  consentStatus: ConsentStatus;
  documentPolicy: LenderVerificationDocumentPolicy;
  documents: ManagerLenderVerificationDocumentRow[];
  changeRequests: ManagerLenderProfileChangeRequestRow[];
  createdAt: string;
  updatedAt: string;
};

export type ManagerLenderVerificationDocumentRow = {
  id: string;
  lenderId: string;
  lenderProfileId: string;
  fileName: string;
  fileType: string;
  documentType: LenderVerificationDocumentType;
  fileSize: number;
  status: LenderVerificationDocumentStatus;
  uploadedAt: string;
  reviewNotes: string | null;
  viewUrl: string | null;
};

export type ManagerLenderProfileChangeRequestRow = {
  id: string;
  lenderId: string;
  lenderProfileId: string;
  proposedOrganizationName: string | null;
  proposedContactPerson: string | null;
  proposedBusinessAddress: string | null;
  proposedOperatingArea: string | null;
  proposedBusinessRegistrationNumber: string | null;
  proposedMinLoanAmount: number | null;
  proposedMaxLoanAmount: number | null;
  proposedTypicalRepaymentTerms: string | null;
  proposedLenderDescription: string | null;
  proposedValues: Json;
  status: Database["public"]["Enums"]["lender_profile_change_request_status"];
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: ManagerProfileSummary | null;
  managerReviewNotes: string | null;
  rejectionReason: string | null;
};

export type ManagerBorrowerVerificationDocumentRow = {
  id: string;
  fileName: string;
  fileType: string;
  documentType: Database["public"]["Enums"]["borrower_verification_document_type"];
  fileSize: number;
  status: Database["public"]["Enums"]["borrower_verification_document_status"];
  uploadedAt: string;
  reviewNotes: string | null;
  viewUrl: string | null;
};

export type ManagerBorrowerVerificationRow = {
  id: string;
  borrower: ManagerProfileSummary;
  verificationStatus: Database["public"]["Enums"]["borrower_verification_status"];
  submittedAt: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: ManagerProfileSummary | null;
  rejectionReason: string | null;
  managerReviewNotes: string | null;
  documentUploadConsentStatus: ConsentStatus;
  loanApplicationConsentStatus: ConsentStatus;
  documentPolicy: BorrowerVerificationDocumentPolicy;
  documents: ManagerBorrowerVerificationDocumentRow[];
};

const activeLoanSelect =
  "id, loan_application_id, accepted_offer_id, borrower_id, lender_id, principal_amount, repayment_amount, fees, outstanding_balance, status, started_at, due_date, repayment_channel, repayment_account_name, repayment_account_number, repayment_instructions, created_at, updated_at";
const applicationSelect =
  "id, borrower_id, borrower_portfolio_id, requested_amount, credit_limit_at_submission, used_credit_at_submission, available_credit_at_submission, monthly_net_cash_flow_at_submission, credit_readiness_status, borrower_profile_snapshot, borrower_readiness_snapshot, borrower_credit_profile_grade, borrower_credit_profile_assessment, purpose, preferred_term, remarks, status, submitted_at, created_at, updated_at";
const auditLogSelect =
  "id, actor_id, action, target_table, target_id, metadata, created_at";
const offerSelect =
  "id, loan_application_id, borrower_id, lender_id, lender_name, approved_amount, repayment_amount, fees, due_date, remarks, status, sent_at, repayment_channel, repayment_account_name, repayment_account_number, repayment_instructions, created_at, updated_at";
const portfolioSelect =
  "id, borrower_id, business_name, business_description, business_type, started_operating_at, business_address, barangay, city_or_municipality, province, region, zip_code, location, operating_model, primary_sales_channel, revenue_period, revenue_confidence, monthly_gross_revenue, monthly_expenses, existing_loan_payments, years_in_operation, expense_breakdown, debt_obligation_summary, loan_purpose_context, profile_last_confirmed_at, profile_review_status, created_at, updated_at";
const profileSelect = "id, role, additional_roles, display_name, status, created_at, updated_at";
const repaymentProofSelect =
  "id, repayment_schedule_id, active_loan_id, borrower_id, lender_id, storage_bucket, storage_path, file_name, file_type, file_size, status, submitted_at, reviewed_at, reviewed_by, review_notes, created_at, updated_at";
const repaymentScheduleSelect =
  "id, active_loan_id, borrower_id, lender_id, installment_number, amount_due, due_date, status, created_at, updated_at";
const lenderProfileFullSelect =
  "id, user_id, organization_name, contact_person, phone_number, business_address, operating_area, business_registration_number, min_loan_amount, max_loan_amount, typical_repayment_terms, lender_description, verification_status, approved_at, approved_by, manager_review_notes, rejection_reason, rejected_at, rejected_by, address_region, address_city_or_municipality, address_barangay, address_zip_code, created_at, updated_at";
const borrowerVerificationSelect =
  "id, borrower_id, verification_status, submitted_at, reviewed_at, reviewed_by, manager_review_notes, rejection_reason, created_at, updated_at";
const borrowerVerificationDocumentSelect =
  "id, borrower_verification_id, borrower_id, storage_bucket, storage_path, document_type, file_name, file_type, file_size, status, uploaded_at, reviewed_at, reviewed_by, review_notes, created_at, updated_at";

const lenderVerificationDocumentSelect =
  "id, lender_id, lender_profile_id, storage_bucket, storage_path, document_type, file_name, file_type, file_size, status, uploaded_at, reviewed_at, reviewed_by, review_notes, created_at, updated_at";

const lenderProfileChangeRequestSelect =
  "id, lender_id, lender_profile_id, proposed_organization_name, proposed_contact_person, proposed_business_address, proposed_operating_area, proposed_business_registration_number, proposed_min_loan_amount, proposed_max_loan_amount, proposed_typical_repayment_terms, proposed_lender_description, proposed_address_region, proposed_address_city, proposed_address_barangay, proposed_address_zip_code, proposed_values, status, submitted_at, reviewed_at, reviewed_by, manager_review_notes, rejection_reason, created_at, updated_at";

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
  expired: "Expired",
  due: "Due",
  verified: "Verified",
  rejected: "Rejected",
  late: "Late",
  approved: "Approved",
  suspended: "Suspended",
  not_started: "Not started",
  pending_documents: "Pending documents",
  under_review: "Under review",
  needs_resubmission: "Needs resubmission",
  incomplete: "Incomplete",
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
    paidLoans,
    submittedProofs,
    rejectedProofs,
    verifiedRepayments,
    openApplications,
    acceptedApplications,
    pendingOffers,
  ] = await Promise.all([
    countRows(supabase, "active_loans", { status: "active" }),
    countRows(supabase, "active_loans", { status: "paid" }),
    countRows(supabase, "repayment_proofs", { status: "submitted" }),
    countRows(supabase, "repayment_proofs", { status: "rejected" }),
    countRows(supabase, "loan_repayment_schedules", { status: "verified" }),
    countApplicationsByStatuses(supabase, ["submitted", "open"]),
    countRows(supabase, "loan_applications", { status: "accepted" }),
    countRows(supabase, "loan_offers", { status: "pending" }),
  ]);

  const counts = [
    activeLoans,
    paidLoans,
    submittedProofs,
    rejectedProofs,
    verifiedRepayments,
    openApplications,
    acceptedApplications,
    pendingOffers,
  ];

  return {
    ok: counts.every((count) => count.ok),
    message: counts.every((count) => count.ok)
      ? "Operations metrics loaded."
      : "Some operations metrics could not be loaded.",
    metrics: [
      { label: "Active loans", value: activeLoans.count, href: "/manager/loans?status=active" },
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
    ],
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

export async function loadManagerLoanDetail(
  supabase: SupabaseServerClient,
  loanId: string,
): Promise<
  | {
      ok: true;
      mode: "loaded";
      message: string;
      loan: ManagerLoanDetail;
    }
  | {
      ok: false;
      mode: "invalid-id" | "not-found" | "supabase";
      message: string;
      loan: null;
    }
> {
  if (!isUuid(loanId)) {
    return {
      ok: false,
      mode: "invalid-id",
      message: "Invalid loan ID.",
      loan: null,
    };
  }

  const { data: loan, error } = await supabase
    .from("active_loans")
    .select(activeLoanSelect)
    .eq("id", loanId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      mode: "supabase",
      message: "Could not load loan.",
      loan: null,
    };
  }

  if (!loan) {
    return {
      ok: false,
      mode: "not-found",
      message: "Loan not found.",
      loan: null,
    };
  }

  const [mappedLoans, schedulesByLoanId, proofsResult] = await Promise.all([
    mapManagerLoans(supabase, [loan]),
    loadSchedulesByLoanIds(supabase, [loan.id]),
    supabase
      .from("repayment_proofs")
      .select(repaymentProofSelect)
      .eq("active_loan_id", loan.id)
      .order("submitted_at", { ascending: false }),
  ]);

  if (proofsResult.error || !mappedLoans[0]) {
    return {
      ok: false,
      mode: "supabase",
      message: "Could not load full loan details.",
      loan: null,
    };
  }

  const repaymentSchedules = schedulesByLoanId.get(loan.id) ?? [];

  return {
    ok: true,
    mode: "loaded",
    message: "Loan loaded.",
    loan: {
      ...mappedLoans[0],
      repaymentSchedules: repaymentSchedules.map((schedule) => ({
        id: schedule.id,
        installmentNumber: schedule.installment_number,
        amountDue: schedule.amount_due,
        dueDate: schedule.due_date,
        status: schedule.status,
      })),
      repaymentProofs: await mapManagerRepaymentProofs(
        supabase,
        proofsResult.data,
      ),
    },
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
  if (filters.submittedTo) {
    query = query.lte("submitted_at", endOfDateFilter(filters.submittedTo));
  }
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
          fileType: proof.file_type,
          fileSize: proof.file_size,
          storageBucket: proof.storage_bucket,
          storagePath: proof.storage_path,
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
  pagination: { page: number; pageSize: number } = { page: 1, pageSize: 20 },
): Promise<{
  ok: boolean;
  message: string;
  logs: ManagerAuditLogRow[];
  totalCount: number;
  page: number;
  pageSize: number;
}> {
  const actorIds = await resolveProfileFilterIds(supabase, filters.actor);

  if (actorIds?.length === 0) {
    return { ok: true, message: "No audit logs matched these filters.", logs: [], totalCount: 0, page: pagination.page, pageSize: pagination.pageSize };
  }

  const from = (pagination.page - 1) * pagination.pageSize;
  const to = from + pagination.pageSize - 1;

  let query = supabase
    .from("audit_logs")
    .select(auditLogSelect, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.action) query = query.ilike("action", `%${filters.action}%`);
  if (filters.targetTable) {
    query = query.ilike("target_table", `%${filters.targetTable}%`);
  }
  if (filters.createdFrom) query = query.gte("created_at", filters.createdFrom);
  if (filters.createdTo) query = query.lte("created_at", endOfDay(filters.createdTo));
  if (actorIds) query = query.in("actor_id", actorIds);

  const { data: logs, error, count } = await query;

  if (error) {
    return { ok: false, message: "Could not load audit logs.", logs: [], totalCount: 0, page: pagination.page, pageSize: pagination.pageSize };
  }

  const profiles = await loadProfilesByIds(
    supabase,
    logs.flatMap((log) => (log.actor_id ? [log.actor_id] : [])),
  );

  return {
    ok: true,
    message: logs.length ? "Audit logs loaded." : "No audit logs matched these filters.",
    logs: logs.map((log) => mapAuditLog(log, profiles)),
    totalCount: count ?? 0,
    page: pagination.page,
    pageSize: pagination.pageSize,
  };
}

export async function loadManagerAuditLogDetail(
  supabase: SupabaseServerClient,
  logId: string,
): Promise<
  | {
      ok: true;
      mode: "loaded";
      message: string;
      log: ManagerAuditLogDetail;
    }
  | {
      ok: false;
      mode: "invalid-id" | "not-found" | "supabase";
      message: string;
      log: null;
    }
> {
  if (!isUuid(logId)) {
    return {
      ok: false,
      mode: "invalid-id",
      message: "Invalid audit log ID.",
      log: null,
    };
  }

  const { data: log, error } = await supabase
    .from("audit_logs")
    .select(auditLogSelect)
    .eq("id", logId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      mode: "supabase",
      message: "Could not load audit log.",
      log: null,
    };
  }

  if (!log) {
    return {
      ok: false,
      mode: "not-found",
      message: "Audit log not found.",
      log: null,
    };
  }

  const profiles = await loadProfilesByIds(
    supabase,
    log.actor_id ? [log.actor_id] : [],
  );

  return {
    ok: true,
    mode: "loaded",
    message: "Audit log loaded.",
    log: {
      ...mapAuditLog(log, profiles),
      metadata: log.metadata,
    },
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

export async function loadManagerApplicationDetail(
  supabase: SupabaseServerClient,
  applicationId: string,
): Promise<
  | {
      ok: true;
      mode: "loaded";
      message: string;
      application: ManagerApplicationDetail;
    }
  | {
      ok: false;
      mode: "invalid-id" | "not-found" | "supabase";
      message: string;
      application: null;
    }
> {
  if (!isUuid(applicationId)) {
    return {
      ok: false,
      mode: "invalid-id",
      message: "Invalid application ID.",
      application: null,
    };
  }

  const { data: application, error } = await supabase
    .from("loan_applications")
    .select(applicationSelect)
    .eq("id", applicationId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      mode: "supabase",
      message: "Could not load application.",
      application: null,
    };
  }

  if (!application) {
    return {
      ok: false,
      mode: "not-found",
      message: "Application not found.",
      application: null,
    };
  }

  const [mappedApplications, offersByApplicationId, loansByApplicationId] =
    await Promise.all([
      mapManagerApplications(supabase, [application]),
      loadOffersByApplicationIds(supabase, [application.id]),
      loadLoansByApplicationIds(supabase, [application.id]),
    ]);
  const mappedApplication = mappedApplications[0];

  if (!mappedApplication) {
    return {
      ok: false,
      mode: "supabase",
      message: "Could not load application.",
      application: null,
    };
  }

  return {
    ok: true,
    mode: "loaded",
    message: "Application loaded.",
    application: {
      ...mappedApplication,
      offers: offersByApplicationId.get(application.id) ?? [],
      activeLoan: loansByApplicationId.get(application.id) ?? null,
    },
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

export async function loadManagerUserDirectory(
  supabase: SupabaseServerClient,
  filters: {
    q?: string;
    role?: string;
    status?: string;
  },
): Promise<{ ok: boolean; message: string; users: ManagerUserDirectoryRow[] }> {
  const term = filters.q?.trim();

  let query = supabase
    .from("profiles")
    .select(profileSelect)
    .order("display_name", { ascending: true })
    .limit(100);

  if (isAppRole(filters.role)) query = query.eq("role", filters.role);
  if (isProfileStatus(filters.status)) query = query.eq("status", filters.status);
  if (term) {
    const safeTerm = escapeFilterTerm(term);
    query = isUuid(term)
      ? query.or(`id.eq.${safeTerm},display_name.ilike.%${safeTerm}%`)
      : query.ilike("display_name", `%${term}%`);
  }

  const { data: profiles, error } = await query;

  if (error) {
    return { ok: false, message: "Could not load users.", users: [] };
  }

  const users = await mapManagerUsers(supabase, profiles);

  return {
    ok: true,
    message: users.length ? "Users loaded." : "No users matched these filters.",
    users,
  };
}

export async function loadManagerUserDetail(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<ManagerUserDetailLoadResult> {
  if (!isUuid(userId)) {
    return {
      ok: false,
      mode: "invalid-id",
      message: "Invalid user ID.",
      user: null,
    };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(profileSelect)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      mode: "supabase",
      message: "Could not load user.",
      user: null,
    };
  }

  if (!profile) {
    return {
      ok: false,
      mode: "not-found",
      message: "User not found.",
      user: null,
    };
  }

  const [directoryUser] = await mapManagerUsers(supabase, [profile]);

  if (directoryUser.role === "borrower") {
    const [portfolioMap, applicationsMap, activeLoansResult] = await Promise.all([
      loadPortfoliosByBorrowerIds(supabase, [profile.id]),
      loadApplicationsByBorrowerIds(supabase, [profile.id]),
      supabase
        .from("active_loans")
        .select(activeLoanSelect)
        .eq("borrower_id", profile.id)
        .order("due_date", { ascending: true }),
    ]);
    const applicationRows = applicationsMap.get(profile.id) ?? [];
    const [mappedApplications, loansByApplicationId, activeLoans] =
      await Promise.all([
        mapManagerApplications(supabase, applicationRows),
        loadLoansByApplicationIds(
          supabase,
          applicationRows.map((application) => application.id),
        ),
        activeLoansResult.error
          ? Promise.resolve([])
          : mapManagerLoans(supabase, activeLoansResult.data),
      ]);

    const user = {
      ...directoryUser,
      portfolio: portfolioMap.get(profile.id) ?? null,
      applications: mappedApplications.map((application) => ({
        ...application,
        activeLoan: loansByApplicationId.get(application.id) ?? null,
      })),
      activeLoans,
    };

    if (activeLoansResult.error) {
      return {
        ok: false,
        mode: "partial",
        message: "Could not load full user details.",
        user,
      };
    }

    return {
      ok: true,
      mode: "loaded",
      message: "User loaded.",
      user,
    };
  }

  if (directoryUser.role === "lender") {
    const [lenderProfiles, offersByLenderId, activeLoansResult, submittedProofs] =
      await Promise.all([
        loadLenderProfilesByUserIds(supabase, [profile.id]),
        loadOffersByLenderIds(supabase, [profile.id]),
        supabase
          .from("active_loans")
          .select(activeLoanSelect)
          .eq("lender_id", profile.id)
          .order("due_date", { ascending: true }),
        loadManagerRepayments(supabase, {
          proofStatus: "submitted",
          lender: profile.id,
        }),
      ]);
    const activeLoans = activeLoansResult.error
      ? []
      : await mapManagerLoans(supabase, activeLoansResult.data);

    const user = {
      ...directoryUser,
      lenderProfile: lenderProfiles.get(profile.id) ?? null,
      offers: offersByLenderId.get(profile.id) ?? [],
      activeLoans,
      submittedProofs: submittedProofs.proofs,
    };

    if (activeLoansResult.error || !submittedProofs.ok) {
      return {
        ok: false,
        mode: "partial",
        message: "Could not load full user details.",
        user,
      };
    }

    return {
      ok: true,
      mode: "loaded",
      message: "User loaded.",
      user,
    };
  }

  return { ok: true, mode: "loaded", message: "User loaded.", user: directoryUser };
}

export async function loadManagerRepaymentProofDetail(
  supabase: SupabaseServerClient,
  proofId: string,
): Promise<{
  ok: boolean;
  message: string;
  proof: ManagerRepaymentProofRow | null;
}> {
  if (!isUuid(proofId)) {
    return { ok: false, message: "Invalid repayment proof ID.", proof: null };
  }

  const { data: proof, error } = await supabase
    .from("repayment_proofs")
    .select(repaymentProofSelect)
    .eq("id", proofId)
    .maybeSingle();

  if (error) {
    return { ok: false, message: "Could not load repayment proof.", proof: null };
  }

  if (!proof) {
    return { ok: true, message: "Repayment proof not found.", proof: null };
  }

  const [schedules, profiles] = await Promise.all([
    loadSchedulesByIds(supabase, [proof.repayment_schedule_id]),
    loadProfilesByIds(supabase, [proof.borrower_id, proof.lender_id]),
  ]);
  const schedule = schedules.get(proof.repayment_schedule_id);

  if (!schedule) {
    return {
      ok: false,
      message: "Could not load repayment schedule for this proof.",
      proof: null,
    };
  }

  return {
    ok: true,
    message: "Repayment proof loaded.",
    proof: {
      id: proof.id,
      fileName: proof.file_name,
      fileType: proof.file_type,
      fileSize: proof.file_size,
      storageBucket: proof.storage_bucket,
      storagePath: proof.storage_path,
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
  };
}

export async function loadManagerLenders(
  supabase: SupabaseServerClient,
  filters: {
    verificationStatus?: string;
  },
): Promise<{ ok: boolean; message: string; lenders: ManagerLenderRow[] }> {
  let query = supabase
    .from("lender_profiles")
    .select(lenderProfileFullSelect)
    .order("created_at", { ascending: false })
    .limit(100);

  if (
    filters.verificationStatus &&
    ["incomplete", "pending", "approved", "rejected"].includes(filters.verificationStatus)
  ) {
    query = query.eq(
      "verification_status",
      filters.verificationStatus as Database["public"]["Enums"]["lender_verification_status"],
    );
  }

  const { data: lenderRows, error } = await query;

  if (error) {
    return { ok: false, message: "Could not load lenders.", lenders: [] };
  }

  const lenders = await mapManagerLenderRows(supabase, lenderRows);

  return {
    ok: true,
    message: lenders.length
      ? "Lenders loaded."
      : "No lenders matched these filters.",
    lenders,
  };
}

export async function loadManagerLenderDetail(
  supabase: SupabaseServerClient,
  lenderProfileId: string,
): Promise<{ ok: boolean; message: string; lender: ManagerLenderRow | null }> {
  if (!isUuid(lenderProfileId)) {
    return { ok: false, message: "Invalid lender profile ID.", lender: null };
  }

  const { data: lenderRow, error } = await supabase
    .from("lender_profiles")
    .select(lenderProfileFullSelect)
    .eq("id", lenderProfileId)
    .maybeSingle();

  if (error) {
    return { ok: false, message: "Could not load lender.", lender: null };
  }

  if (!lenderRow) {
    return { ok: true, message: "Lender not found.", lender: null };
  }

  const [lender] = await mapManagerLenderRows(supabase, [lenderRow]);

  return { ok: true, message: "Lender loaded.", lender: lender ?? null };
}

export async function loadManagerBorrowerVerifications(
  supabase: SupabaseServerClient,
  filters: {
    status?: string;
    documentStatus?: string;
    borrower?: string;
  },
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

  if (
    filters.status &&
    [
      "pending_documents",
      "submitted",
      "under_review",
      "approved",
      "rejected",
      "needs_resubmission",
    ].includes(filters.status)
  ) {
    query = query.eq(
      "verification_status",
      filters.status as Database["public"]["Enums"]["borrower_verification_status"],
    );
  }

  if (borrowerIds) query = query.in("borrower_id", borrowerIds);

  const { data: verificationRows, error } = await query;

  if (error) {
    return {
      ok: false,
      message: "Could not load borrower verifications.",
      verifications: [],
    };
  }

  if (verificationRows.length === 0) {
    return {
      ok: true,
      message: "No borrower verifications matched these filters.",
      verifications: [],
    };
  }

  const verificationIds = verificationRows.map((row) => row.id);
  const borrowerIdList = verificationRows.map((row) => row.borrower_id);
  const reviewedByIds = verificationRows
    .map((row) => row.reviewed_by)
    .filter(Boolean) as string[];

  const [allDocumentRows, profiles, reviewerProfiles] = await Promise.all([
    supabase
      .from("borrower_verification_documents")
      .select(borrowerVerificationDocumentSelect)
      .in("borrower_verification_id", verificationIds)
      .order("uploaded_at", { ascending: false }),
    loadProfilesByIds(supabase, borrowerIdList),
    loadProfilesByIds(supabase, reviewedByIds),
  ]);

  const documentsByVerificationId = new Map<
    string,
    typeof allDocumentRows.data
  >();

  for (const doc of allDocumentRows.data ?? []) {
    const list = documentsByVerificationId.get(doc.borrower_verification_id) ?? [];
    list.push(doc);
    documentsByVerificationId.set(doc.borrower_verification_id, list);
  }

  let filteredVerificationRows = verificationRows;

  if (
    filters.documentStatus &&
    ["submitted", "accepted", "rejected"].includes(filters.documentStatus)
  ) {
    filteredVerificationRows = verificationRows.filter((row) => {
      const docs = documentsByVerificationId.get(row.id) ?? [];
      return docs.some((doc) => doc.status === filters.documentStatus);
    });
  }

  const consentUserIds = [
    ...new Set(filteredVerificationRows.map((row) => row.borrower_id)),
  ];
  const consentRecordsByUserId = new Map<string, Awaited<ReturnType<typeof loadUserConsents>>>();

  await Promise.all(
    consentUserIds.map(async (userId) => {
      const consents = await loadUserConsents(supabase, userId);
      consentRecordsByUserId.set(userId, consents);
    }),
  );

  const verifications = await Promise.all(
    filteredVerificationRows.map(async (row) => {
      const rawDocs = documentsByVerificationId.get(row.id) ?? [];
      const mappedDocs: ManagerBorrowerVerificationDocumentRow[] =
        await Promise.all(
          rawDocs.map(async (doc) => {
            let viewUrl: string | null = null;

            if (doc.storage_bucket && doc.storage_path) {
              const { data: signed } = await supabase.storage
                .from(doc.storage_bucket)
                .createSignedUrl(doc.storage_path, 3600);
              viewUrl = signed?.signedUrl ?? null;
            }

            return {
              id: doc.id,
              fileName: doc.file_name,
              fileType: doc.file_type,
              documentType: doc.document_type,
              fileSize: doc.file_size,
              status: doc.status,
              uploadedAt: doc.uploaded_at,
              reviewNotes: doc.review_notes,
              viewUrl,
            };
          }),
        );

      const userConsents = consentRecordsByUserId.get(row.borrower_id) ?? [];

      return {
        id: row.id,
        borrower: getProfileSummary(profiles, row.borrower_id),
        verificationStatus: row.verification_status,
        submittedAt: row.submitted_at,
        createdAt: row.created_at,
        reviewedAt: row.reviewed_at,
        reviewedBy: row.reviewed_by
          ? getProfileSummary(reviewerProfiles, row.reviewed_by)
          : null,
        rejectionReason: row.rejection_reason,
        managerReviewNotes: row.manager_review_notes,
        documentUploadConsentStatus: buildConsentStatus(
          "borrower_document_upload",
          userConsents,
        ),
        loanApplicationConsentStatus: buildConsentStatus(
          "borrower_loan_application",
          userConsents,
        ),
        documentPolicy: calculateBorrowerVerificationDocumentPolicy(mappedDocs),
        documents: mappedDocs,
      };
    }),
  );

  return {
    ok: true,
    message: verifications.length
      ? "Borrower verifications loaded."
      : "No borrower verifications matched these filters.",
    verifications,
  };
}

export async function loadManagerBorrowerVerification(
  supabase: SupabaseServerClient,
  verificationId: string,
): Promise<{
  ok: boolean;
  message: string;
  verification: ManagerBorrowerVerificationRow | null;
}> {
  const { data: row, error } = await supabase
    .from("borrower_verifications")
    .select(borrowerVerificationSelect)
    .eq("id", verificationId)
    .maybeSingle();

  if (error) {
    return { ok: false, message: "Could not load borrower verification.", verification: null };
  }

  if (!row) {
    return { ok: true, message: "Borrower verification not found.", verification: null };
  }

  const [allDocumentRows, profiles, reviewerProfiles] = await Promise.all([
    supabase
      .from("borrower_verification_documents")
      .select(borrowerVerificationDocumentSelect)
      .eq("borrower_verification_id", row.id)
      .order("uploaded_at", { ascending: false }),
    loadProfilesByIds(supabase, [row.borrower_id]),
    loadProfilesByIds(supabase, [row.reviewed_by].filter(Boolean) as string[]),
  ]);

  const rawDocs = allDocumentRows.data ?? [];
  const mappedDocs: ManagerBorrowerVerificationDocumentRow[] = await Promise.all(
    rawDocs.map(async (doc) => {
      let viewUrl: string | null = null;
      if (doc.storage_bucket && doc.storage_path) {
        const { data: signed } = await supabase.storage
          .from(doc.storage_bucket)
          .createSignedUrl(doc.storage_path, 3600);
        viewUrl = signed?.signedUrl ?? null;
      }
      return {
        id: doc.id,
        fileName: doc.file_name,
        fileType: doc.file_type,
        documentType: doc.document_type,
        fileSize: doc.file_size,
        status: doc.status,
        uploadedAt: doc.uploaded_at,
        reviewNotes: doc.review_notes,
        viewUrl,
      };
    }),
  );

  const userConsents = await loadUserConsents(supabase, row.borrower_id);

  const verification: ManagerBorrowerVerificationRow = {
    id: row.id,
    borrower: getProfileSummary(profiles, row.borrower_id),
    verificationStatus: row.verification_status,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by
      ? getProfileSummary(reviewerProfiles, row.reviewed_by)
      : null,
    rejectionReason: row.rejection_reason,
    managerReviewNotes: row.manager_review_notes,
    documentUploadConsentStatus: buildConsentStatus("borrower_document_upload", userConsents),
    loanApplicationConsentStatus: buildConsentStatus("borrower_loan_application", userConsents),
    documentPolicy: calculateBorrowerVerificationDocumentPolicy(mappedDocs),
    documents: mappedDocs,
  };

  return { ok: true, message: "Borrower verification loaded.", verification };
}

async function mapManagerRepaymentProofs(
  supabase: SupabaseServerClient,
  proofs: Database["public"]["Tables"]["repayment_proofs"]["Row"][],
) {
  const [schedules, profiles] = await Promise.all([
    loadSchedulesByIds(
      supabase,
      proofs.map((proof) => proof.repayment_schedule_id),
    ),
    loadProfilesByIds(
      supabase,
      proofs.flatMap((proof) => [proof.borrower_id, proof.lender_id]),
    ),
  ]);

  return proofs.flatMap((proof) => {
    const schedule = schedules.get(proof.repayment_schedule_id);

    if (!schedule) return [];

    return {
      id: proof.id,
      fileName: proof.file_name,
      fileType: proof.file_type,
      fileSize: proof.file_size,
      storageBucket: proof.storage_bucket,
      storagePath: proof.storage_path,
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
    };
  });
}

async function mapManagerLenderRows(
  supabase: SupabaseServerClient,
  lenderRows: Array<{
    id: string;
    user_id: string;
    organization_name: string | null;
    contact_person: string | null;
    phone_number: string | null;
    business_address: string | null;
    operating_area: string | null;
    business_registration_number: string | null;
    min_loan_amount: number | null;
    max_loan_amount: number | null;
    typical_repayment_terms: string | null;
    lender_description: string | null;
    verification_status: Database["public"]["Enums"]["lender_verification_status"];
    approved_at: string | null;
    approved_by: string | null;
    manager_review_notes: string | null;
    rejection_reason: string | null;
    rejected_at: string | null;
    rejected_by: string | null;
    created_at: string;
    updated_at: string;
  }>,
): Promise<ManagerLenderRow[]> {
  const userIds = lenderRows.map((row) => row.user_id);
  const approvedByIds = lenderRows
    .map((row) => row.approved_by)
    .filter(Boolean) as string[];
  const rejectedByIds = lenderRows
    .map((row) => row.rejected_by)
    .filter(Boolean) as string[];
  const allProfileIds = [
    ...new Set([...userIds, ...approvedByIds, ...rejectedByIds]),
  ];

  const profileIds = lenderRows.map((r) => r.id);

  const [profiles, consentResults, documentRows, changeRequestRows] = await Promise.all([
    loadProfilesByIds(supabase, allProfileIds),
    Promise.all(
      userIds.map(async (userId) => ({
        userId,
        consents: await loadUserConsents(supabase, userId),
      })),
    ),
    supabase
      .from("lender_verification_documents")
      .select(lenderVerificationDocumentSelect)
      .in("lender_profile_id", profileIds)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("lender_profile_change_requests")
      .select(lenderProfileChangeRequestSelect)
      .in("lender_profile_id", profileIds)
      .order("submitted_at", { ascending: false }),
  ]);

  const consentMap = new Map(
    consentResults.map((result) => [result.userId, result.consents]),
  );

  const documentsByProfileId = new Map<string, typeof documentRows.data>();
  for (const doc of documentRows.data ?? []) {
    const list = documentsByProfileId.get(doc.lender_profile_id) ?? [];
    list.push(doc);
    documentsByProfileId.set(doc.lender_profile_id, list);
  }

  const changeRequestsByProfileId = new Map<string, typeof changeRequestRows.data>();
  for (const req of changeRequestRows.data ?? []) {
    const list = changeRequestsByProfileId.get(req.lender_profile_id) ?? [];
    list.push(req);
    changeRequestsByProfileId.set(req.lender_profile_id, list);
  }

  const reviewerIds = [
    ...(documentRows.data ?? []).map((d) => d.reviewed_by).filter(Boolean) as string[],
    ...(changeRequestRows.data ?? []).map((r) => r.reviewed_by).filter(Boolean) as string[],
  ];
  const reviewerProfiles = await loadProfilesByIds(supabase, reviewerIds);

  return Promise.all(lenderRows.map(async (row) => {
    const rawDocs = documentsByProfileId.get(row.id) ?? [];
    const documents: ManagerLenderVerificationDocumentRow[] = await Promise.all(
      rawDocs.map(async (doc) => {
        let viewUrl: string | null = null;
        if (doc.storage_bucket && doc.storage_path) {
          try {
            const { data: signed } = await supabase.storage
              .from(doc.storage_bucket)
              .createSignedUrl(doc.storage_path, 3600);
            viewUrl = signed?.signedUrl ?? null;
          } catch {
            viewUrl = null;
          }
        }
        return {
          id: doc.id,
          lenderId: doc.lender_id,
          lenderProfileId: doc.lender_profile_id,
          fileName: doc.file_name,
          fileType: doc.file_type,
          documentType: doc.document_type,
          fileSize: doc.file_size,
          status: doc.status,
          uploadedAt: doc.uploaded_at,
          reviewNotes: doc.review_notes,
          viewUrl,
        };
      }),
    );

    const rawReqs = changeRequestsByProfileId.get(row.id) ?? [];
    const changeRequests: ManagerLenderProfileChangeRequestRow[] = rawReqs.map((req) => ({
      id: req.id,
      lenderId: req.lender_id,
      lenderProfileId: req.lender_profile_id,
      proposedOrganizationName: req.proposed_organization_name,
      proposedContactPerson: req.proposed_contact_person,
      proposedBusinessAddress: req.proposed_business_address,
      proposedOperatingArea: req.proposed_operating_area,
      proposedBusinessRegistrationNumber: req.proposed_business_registration_number,
      proposedMinLoanAmount: req.proposed_min_loan_amount,
      proposedMaxLoanAmount: req.proposed_max_loan_amount,
      proposedTypicalRepaymentTerms: req.proposed_typical_repayment_terms,
      proposedLenderDescription: req.proposed_lender_description,
      proposedValues: req.proposed_values,
      status: req.status,
      submittedAt: req.submitted_at,
      reviewedAt: req.reviewed_at,
      reviewedBy: req.reviewed_by
        ? getProfileSummary(reviewerProfiles, req.reviewed_by)
        : null,
      managerReviewNotes: req.manager_review_notes,
      rejectionReason: req.rejection_reason,
    }));

    return {
      id: row.id,
      userId: row.user_id,
      profile: getProfileSummary(profiles, row.user_id),
      organizationName: row.organization_name ?? "",
      contactPerson: row.contact_person ?? "",
      phoneNumber: row.phone_number ?? "",
      businessAddress: row.business_address ?? "",
      operatingArea: row.operating_area ?? "",
      businessRegistrationNumber: row.business_registration_number,
      minLoanAmount: row.min_loan_amount ?? 0,
      maxLoanAmount: row.max_loan_amount ?? 0,
      typicalRepaymentTerms: row.typical_repayment_terms ?? "",
      lenderDescription: row.lender_description ?? "",
      verificationStatus: row.verification_status,
      approvedAt: row.approved_at,
      approvedBy: row.approved_by
        ? getProfileSummary(profiles, row.approved_by)
        : null,
      rejectedAt: row.rejected_at,
      rejectedBy: row.rejected_by
        ? getProfileSummary(profiles, row.rejected_by)
        : null,
      managerReviewNotes: row.manager_review_notes,
      rejectionReason: row.rejection_reason,
      consentStatus: buildConsentStatus(
        "lender_review",
        consentMap.get(row.user_id) ?? [],
      ),
      documentPolicy: calculateLenderVerificationDocumentPolicy(documents),
      documents,
      changeRequests,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }));
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

  return loans.map((loan) => {
    const interestAmount = deriveInterestAmount({
      principalAmount: loan.principal_amount,
      repaymentAmount: loan.repayment_amount,
      fees: loan.fees,
    });

    return {
      id: loan.id,
      borrower: getProfileSummary(profiles, loan.borrower_id),
      lender: getProfileSummary(profiles, loan.lender_id),
      principalAmount: loan.principal_amount,
      repaymentAmount: loan.repayment_amount,
      totalRepaymentAmount: loan.repayment_amount,
      fees: loan.fees,
      interestAmount,
      outstandingBalance: loan.outstanding_balance,
      status: loan.status,
      startedAt: loan.started_at ?? null,
      dueDate: loan.due_date ?? null,
      schedule: createScheduleSummary(schedules.get(loan.id) ?? []),
    };
  });
}

async function mapManagerUsers(
  supabase: SupabaseServerClient,
  profiles: ProfileRow[],
): Promise<ManagerUserDirectoryRow[]> {
  const borrowerIds = profiles
    .filter((profile) => profile.role === "borrower")
    .map((profile) => profile.id);
  const lenderIds = profiles
    .filter((profile) => profile.role === "lender")
    .map((profile) => profile.id);

  const [
    portfolios,
    applicationsByBorrowerId,
    borrowerActiveLoanCounts,
    lenderProfiles,
    offersByLenderId,
    lenderActiveLoanCounts,
    submittedProofCounts,
  ] = await Promise.all([
    loadPortfoliosByBorrowerIds(supabase, borrowerIds),
    loadApplicationsByBorrowerIds(supabase, borrowerIds),
    countActiveLoansByColumn(supabase, "borrower_id", borrowerIds),
    loadLenderProfilesByUserIds(supabase, lenderIds),
    loadOffersByLenderIds(supabase, lenderIds),
    countActiveLoansByColumn(supabase, "lender_id", lenderIds),
    countSubmittedProofsByLenderIds(supabase, lenderIds),
  ]);

  return profiles.map((profile) => {
    const summary = toProfileSummary(profile);

    if (profile.role === "borrower") {
      const applications = applicationsByBorrowerId.get(profile.id) ?? [];

      return {
        role: "borrower",
        profile: summary,
        status: profile.status,
        portfolioLocation: portfolios.get(profile.id)?.location ?? null,
        applicationCount: applications.length,
        activeLoanCount: borrowerActiveLoanCounts.get(profile.id) ?? 0,
        latestApplicationStatus: applications[0]?.status ?? null,
      };
    }

    if (profile.role === "lender") {
      const offers = offersByLenderId.get(profile.id) ?? [];
      const lenderProfile = lenderProfiles.get(profile.id);

      return {
        role: "lender",
        profile: summary,
        status: profile.status,
        organizationName: lenderProfile?.organization_name ?? null,
        verificationStatus: lenderProfile?.verification_status ?? null,
        offerCount: offers.length,
        acceptedOfferCount: offers.filter((offer) => offer.status === "accepted")
          .length,
        activeLoanCount: lenderActiveLoanCounts.get(profile.id) ?? 0,
        submittedProofCount: submittedProofCounts.get(profile.id) ?? 0,
      };
    }

    return {
      role: "manager",
      profile: summary,
      status: profile.status,
    };
  });
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
            fees: acceptedOffer.fees,
            interestAmount: deriveInterestAmount({
              principalAmount: acceptedOffer.approved_amount,
              repaymentAmount: acceptedOffer.repayment_amount,
              fees: acceptedOffer.fees,
            }),
            totalRepaymentAmount: acceptedOffer.repayment_amount,
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

async function loadPortfoliosByBorrowerIds(
  supabase: SupabaseServerClient,
  borrowerIds: string[],
) {
  if (borrowerIds.length === 0) return new Map<string, BorrowerPortfolioRow>();

  const { data, error } = await supabase
    .from("borrower_portfolios")
    .select(portfolioSelect)
    .in("borrower_id", borrowerIds);

  if (error) return new Map<string, BorrowerPortfolioRow>();

  return new Map(data.map((portfolio) => [portfolio.borrower_id, portfolio]));
}

async function loadApplicationsByBorrowerIds(
  supabase: SupabaseServerClient,
  borrowerIds: string[],
) {
  if (borrowerIds.length === 0) return new Map<string, ApplicationRow[]>();

  const { data, error } = await supabase
    .from("loan_applications")
    .select(applicationSelect)
    .in("borrower_id", borrowerIds)
    .order("submitted_at", { ascending: false });

  if (error) return new Map<string, ApplicationRow[]>();

  return data.reduce((groups, application) => {
    groups.set(application.borrower_id, [
      ...(groups.get(application.borrower_id) ?? []),
      application,
    ]);
    return groups;
  }, new Map<string, ApplicationRow[]>());
}

async function loadLenderProfilesByUserIds(
  supabase: SupabaseServerClient,
  userIds: string[],
) {
  if (userIds.length === 0) return new Map<string, LenderProfileRow>();

  const { data, error } = await supabase
    .from("lender_profiles")
    .select(lenderProfileFullSelect)
    .in("user_id", userIds);

  if (error) return new Map<string, LenderProfileRow>();

  return new Map(data.map((profile) => [profile.user_id, profile]));
}

async function loadOffersByLenderIds(
  supabase: SupabaseServerClient,
  lenderIds: string[],
) {
  if (lenderIds.length === 0) return new Map<string, LoanOfferRow[]>();

  const { data, error } = await supabase
    .from("loan_offers")
    .select(offerSelect)
    .in("lender_id", lenderIds);

  if (error) return new Map<string, LoanOfferRow[]>();

  return data.reduce((groups, offer) => {
    groups.set(offer.lender_id, [...(groups.get(offer.lender_id) ?? []), offer]);
    return groups;
  }, new Map<string, LoanOfferRow[]>());
}

async function countActiveLoansByColumn(
  supabase: SupabaseServerClient,
  column: "borrower_id" | "lender_id",
  ids: string[],
) {
  if (ids.length === 0) return new Map<string, number>();

  const { data, error } = await supabase
    .from("active_loans")
    .select(`id, ${column}`)
    .eq("status", "active")
    .in(column, ids);

  if (error) return new Map<string, number>();

  const rows = data as Array<{ borrower_id?: string; lender_id?: string }>;

  return rows.reduce((counts, row) => {
    const id = row[column];
    if (!id) return counts;
    counts.set(id, (counts.get(id) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
}

async function countSubmittedProofsByLenderIds(
  supabase: SupabaseServerClient,
  lenderIds: string[],
) {
  if (lenderIds.length === 0) return new Map<string, number>();

  const { data, error } = await supabase
    .from("repayment_proofs")
    .select("id, lender_id")
    .eq("status", "submitted")
    .in("lender_id", lenderIds);

  if (error) return new Map<string, number>();

  return data.reduce((counts, proof) => {
    counts.set(proof.lender_id, (counts.get(proof.lender_id) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
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

async function countRows(
  supabase: SupabaseServerClient,
  table:
    | "active_loans"
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

function endOfDateFilter(value: string) {
  return value.includes("T") ? value : endOfDay(value);
}

function escapeFilterTerm(value: string) {
  return value.replace(/[%(),]/g, "");
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

function isAppRole(
  value: string | undefined,
): value is Database["public"]["Enums"]["app_role"] {
  return ["borrower", "lender", "manager"].includes(value ?? "");
}

function isProfileStatus(
  value: string | undefined,
): value is Database["public"]["Enums"]["profile_status"] {
  return ["active", "pending", "suspended"].includes(value ?? "");
}

function isProofStatus(
  value: string | undefined,
): value is Database["public"]["Enums"]["repayment_proof_status"] {
  return ["submitted", "verified", "rejected"].includes(value ?? "");
}

function isRepaymentStatus(
  value: string | undefined,
): value is Database["public"]["Enums"]["repayment_status"] {
  return ["due", "submitted", "verified", "rejected", "late"].includes(value ?? "");
}
