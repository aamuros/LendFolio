import {
  requireApprovedLender,
  requireBorrower,
  requireManager,
} from "@/lib/access-control";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type BorrowerAccess = Extract<
  Awaited<ReturnType<typeof requireBorrower>>,
  { ok: true }
>;
type LenderAccess = Extract<
  Awaited<ReturnType<typeof requireApprovedLender>>,
  { ok: true }
>;

type ActiveLoanRow = Database["public"]["Tables"]["active_loans"]["Row"];
type RepaymentScheduleRow =
  Database["public"]["Tables"]["loan_repayment_schedules"]["Row"];
type RepaymentProofRow = Database["public"]["Tables"]["repayment_proofs"]["Row"];

export type RepaymentProofSummary = {
  id: string;
  status: Database["public"]["Enums"]["repayment_proof_status"];
  fileName: string;
  fileType: string;
  fileSize: number;
  submittedAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
  viewUrl: string | null;
};

export type RepaymentScheduleSummary = {
  id: string;
  activeLoanId: string;
  borrowerId: string;
  lenderId: string;
  installmentNumber: number;
  amountDue: number;
  dueDate: string;
  status: Database["public"]["Enums"]["repayment_status"];
  latestProof: RepaymentProofSummary | null;
  proofs: RepaymentProofSummary[];
};

export type ActiveLoanSummary = {
  id: string;
  applicationId: string;
  acceptedOfferId: string;
  borrowerId: string;
  lenderId: string;
  principalAmount: number;
  repaymentAmount: number;
  fees: number;
  outstandingBalance: number;
  status: Database["public"]["Enums"]["active_loan_status"];
  startedAt: string;
  dueDate: string;
  schedule: RepaymentScheduleSummary[];
};

export type ActiveLoansLoadResult =
  | {
      ok: true;
      mode: "supabase";
      loans: ActiveLoanSummary[];
      message: string;
    }
  | {
      ok: false;
      mode: "auth" | "supabase";
      loans: ActiveLoanSummary[];
      message: string;
    };

const activeLoanSelect =
  "id, loan_application_id, accepted_offer_id, borrower_id, lender_id, principal_amount, repayment_amount, fees, outstanding_balance, status, started_at, due_date, created_at, updated_at";

const repaymentScheduleSelect =
  "id, active_loan_id, borrower_id, lender_id, installment_number, amount_due, due_date, status, created_at, updated_at";
const repaymentProofSelect =
  "id, repayment_schedule_id, active_loan_id, borrower_id, lender_id, storage_bucket, storage_path, file_name, file_type, file_size, status, submitted_at, reviewed_at, reviewed_by, review_notes, created_at, updated_at";

export async function loadBorrowerActiveLoans(
  verifiedAccess?: BorrowerAccess,
): Promise<ActiveLoansLoadResult> {
  try {
    const supabase =
      verifiedAccess?.supabase ?? (await createSupabaseServerClient());
    const access = verifiedAccess ?? (await requireBorrower(supabase));

    if (!access.ok) {
      return {
        ok: false,
        mode: "auth",
        loans: [],
        message: access.message,
      };
    }

    return loadActiveLoansForColumn("borrower_id", access.profile.id, supabase);
  } catch {
    return {
      ok: false,
      mode: "auth",
      loans: [],
      message: "Sign in to continue.",
    };
  }
}

export async function loadLenderActiveLoans(
  verifiedAccess?: LenderAccess,
): Promise<ActiveLoansLoadResult> {
  try {
    const supabase =
      verifiedAccess?.supabase ?? (await createSupabaseServerClient());
    const access = verifiedAccess ?? (await requireApprovedLender(supabase));

    if (!access.ok) {
      return {
        ok: false,
        mode: "auth",
        loans: [],
        message: access.message,
      };
    }

    return loadActiveLoansForColumn("lender_id", access.profile.id, supabase);
  } catch {
    return {
      ok: false,
      mode: "auth",
      loans: [],
      message: "Sign in to continue.",
    };
  }
}

export async function loadManagerActiveLoans(): Promise<ActiveLoansLoadResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireManager(supabase);

    if (!access.ok) {
      return {
        ok: false,
        mode: "auth",
        loans: [],
        message: access.message,
      };
    }

    const { data: loans, error } = await supabase
      .from("active_loans")
      .select(activeLoanSelect)
      .order("started_at", { ascending: false })
      .limit(10);

    if (error) {
      return {
        ok: false,
        mode: "supabase",
        loans: [],
        message: "Could not load active loans.",
      };
    }

    return loadSchedulesForLoans(loans);
  } catch {
    return {
      ok: false,
      mode: "auth",
      loans: [],
      message: "Sign in to continue.",
    };
  }
}

export function mapActiveLoanRow(
  row: ActiveLoanRow,
  schedule: RepaymentScheduleSummary[] = [],
): ActiveLoanSummary {
  return {
    id: row.id,
    applicationId: row.loan_application_id,
    acceptedOfferId: row.accepted_offer_id,
    borrowerId: row.borrower_id,
    lenderId: row.lender_id,
    principalAmount: row.principal_amount,
    repaymentAmount: row.repayment_amount,
    fees: row.fees,
    outstandingBalance: row.outstanding_balance,
    status: row.status,
    startedAt: row.started_at,
    dueDate: row.due_date,
    schedule,
  };
}

export function mapRepaymentScheduleRow(
  row: RepaymentScheduleRow,
  proofs: RepaymentProofSummary[] = [],
): RepaymentScheduleSummary {
  return {
    id: row.id,
    activeLoanId: row.active_loan_id,
    borrowerId: row.borrower_id,
    lenderId: row.lender_id,
    installmentNumber: row.installment_number,
    amountDue: row.amount_due,
    dueDate: row.due_date,
    status: row.status,
    latestProof: proofs[0] ?? null,
    proofs,
  };
}

async function loadActiveLoansForColumn(
  column: "borrower_id" | "lender_id",
  userId: string,
  verifiedClient?: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<ActiveLoansLoadResult> {
  const supabase = verifiedClient ?? (await createSupabaseServerClient());
  const { data: loans, error } = await supabase
    .from("active_loans")
    .select(activeLoanSelect)
    .eq(column, userId)
    .order("started_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      mode: "supabase",
      loans: [],
      message: "Could not load active loans.",
    };
  }

  return loadSchedulesForLoans(loans);
}

async function loadSchedulesForLoans(
  loans: ActiveLoanRow[],
): Promise<ActiveLoansLoadResult> {
  if (loans.length === 0) {
    return {
      ok: true,
      mode: "supabase",
      loans: [],
      message: "No active loans.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const loanIds = loans.map((loan) => loan.id);
  const { data: scheduleRows, error } = await supabase
    .from("loan_repayment_schedules")
    .select(repaymentScheduleSelect)
    .in("active_loan_id", loanIds)
    .order("installment_number", { ascending: true });

  if (error) {
    return {
      ok: false,
      mode: "supabase",
      loans: [],
      message: "Could not load repayment schedule.",
    };
  }

  const scheduleIds = scheduleRows.map((schedule) => schedule.id);
  const proofsByScheduleId =
    scheduleIds.length > 0
      ? await loadProofsByScheduleId(scheduleIds)
      : new Map<string, RepaymentProofSummary[]>();
  const schedulesByLoanId = new Map<string, RepaymentScheduleSummary[]>();

  scheduleRows.forEach((row) => {
    const schedule = schedulesByLoanId.get(row.active_loan_id) ?? [];
    schedulesByLoanId.set(row.active_loan_id, [
      ...schedule,
      mapRepaymentScheduleRow(row, proofsByScheduleId.get(row.id) ?? []),
    ]);
  });

  return {
    ok: true,
    mode: "supabase",
    loans: loans.map((loan) =>
      mapActiveLoanRow(loan, schedulesByLoanId.get(loan.id) ?? []),
    ),
    message: "Active loans loaded.",
  };
}

async function loadProofsByScheduleId(scheduleIds: string[]) {
  const supabase = await createSupabaseServerClient();
  const { data: proofRows, error } = await supabase
    .from("repayment_proofs")
    .select(repaymentProofSelect)
    .in("repayment_schedule_id", scheduleIds)
    .order("submitted_at", { ascending: false });

  const rows = proofRows ?? [];

  if (error || rows.length === 0) {
    return new Map<string, RepaymentProofSummary[]>();
  }

  const signedProofs = await Promise.all(
    rows.map(async (row) => ({
      repaymentScheduleId: row.repayment_schedule_id,
      proof: await mapRepaymentProofRow(row),
    })),
  );

  return signedProofs.reduce((groups, item) => {
    const scheduleProofs = groups.get(item.repaymentScheduleId) ?? [];
    groups.set(item.repaymentScheduleId, [...scheduleProofs, item.proof]);

    return groups;
  }, new Map<string, RepaymentProofSummary[]>());
}

async function mapRepaymentProofRow(
  row: RepaymentProofRow,
): Promise<RepaymentProofSummary> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.storage
    .from(row.storage_bucket)
    .createSignedUrl(row.storage_path, 300);

  return {
    id: row.id,
    status: row.status,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    reviewNotes: row.review_notes,
    viewUrl: data?.signedUrl ?? null,
  };
}
