import {
  requireApprovedLender,
  requireBorrower,
  requireManager,
} from "@/lib/access-control";
import { deriveInterestAmount } from "@/lib/loan-offer";
export {
  isCompletedLoan,
  isCompletedLoanStatus,
  isOngoingLoanStatus,
} from "@/lib/active-loan-status";
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

export type RepaymentChannelSummary = {
  id: string;
  activeLoanId: string;
  lenderId: string;
  channel: string;
  accountName: string;
  accountNumber: string;
  instructions: string | null;
  createdAt: string;
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
  totalRepaymentAmount: number;
  fees: number;
  interestAmount: number;
  outstandingBalance: number;
  status: Database["public"]["Enums"]["active_loan_status"];
  startedAt: string;
  dueDate: string;
  repaymentChannel: string | null;
  repaymentAccountName: string | null;
  repaymentAccountNumber: string | null;
  repaymentInstructions: string | null;
  additionalRepaymentChannels: RepaymentChannelSummary[];
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
  "id, loan_application_id, accepted_offer_id, borrower_id, lender_id, principal_amount, repayment_amount, fees, outstanding_balance, status, started_at, due_date, repayment_channel, repayment_account_name, repayment_account_number, repayment_instructions, created_at, updated_at";

const repaymentScheduleSelect =
  "id, active_loan_id, borrower_id, lender_id, installment_number, amount_due, due_date, status, was_late, created_at, updated_at";
const repaymentProofSelect =
  "id, repayment_schedule_id, active_loan_id, borrower_id, lender_id, storage_bucket, storage_path, file_name, file_type, file_size, status, submitted_at, reviewed_at, reviewed_by, review_notes, created_at, updated_at";
const repaymentChannelSelect =
  "id, active_loan_id, lender_id, channel, account_name, account_number, instructions, created_at";

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

    return loadSchedulesForLoans(loans, supabase);
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
  additionalChannels: RepaymentChannelSummary[] = [],
): ActiveLoanSummary {
  const interestAmount = deriveInterestAmount({
    principalAmount: row.principal_amount,
    repaymentAmount: row.repayment_amount,
    fees: row.fees,
  });

  return {
    id: row.id,
    applicationId: row.loan_application_id,
    acceptedOfferId: row.accepted_offer_id,
    borrowerId: row.borrower_id,
    lenderId: row.lender_id,
    principalAmount: row.principal_amount,
    repaymentAmount: row.repayment_amount,
    totalRepaymentAmount: row.repayment_amount,
    fees: row.fees,
    interestAmount,
    outstandingBalance: row.outstanding_balance,
    status: row.status,
    startedAt: row.started_at,
    dueDate: row.due_date,
    repaymentChannel: row.repayment_channel,
    repaymentAccountName: row.repayment_account_name,
    repaymentAccountNumber: row.repayment_account_number,
    repaymentInstructions: row.repayment_instructions,
    additionalRepaymentChannels: additionalChannels,
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

type RepaymentChannelRow =
  Database["public"]["Tables"]["repayment_channels"]["Row"];

export function mapRepaymentChannelRow(
  row: RepaymentChannelRow,
): RepaymentChannelSummary {
  return {
    id: row.id,
    activeLoanId: row.active_loan_id,
    lenderId: row.lender_id,
    channel: row.channel,
    accountName: row.account_name,
    accountNumber: row.account_number,
    instructions: row.instructions,
    createdAt: row.created_at,
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

  return loadSchedulesForLoans(loans, supabase);
}

async function loadSchedulesForLoans(
  loans: ActiveLoanRow[],
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<ActiveLoansLoadResult> {
  if (loans.length === 0) {
    return {
      ok: true,
      mode: "supabase",
      loans: [],
      message: "No active loans.",
    };
  }

  const loanIds = loans.map((loan) => loan.id);
  const [scheduleResult, channelsResult] = await Promise.all([
    supabase
      .from("loan_repayment_schedules")
      .select(repaymentScheduleSelect)
      .in("active_loan_id", loanIds)
      .order("installment_number", { ascending: true }),
    supabase
      .from("repayment_channels")
      .select(repaymentChannelSelect)
      .in("active_loan_id", loanIds)
      .order("created_at", { ascending: true }),
  ]);

  const { data: scheduleRows, error: scheduleError } = scheduleResult;
  const { data: channelRows, error: channelError } = channelsResult;

  if (scheduleError) {
    return {
      ok: false,
      mode: "supabase",
      loans: [],
      message: "Could not load repayment schedule.",
    };
  }

  if (channelError) {
    return {
      ok: false,
      mode: "supabase",
      loans: [],
      message: "Could not load repayment channels.",
    };
  }

  const scheduleIds = scheduleRows.map((schedule) => schedule.id);
  const proofsByScheduleId =
    scheduleIds.length > 0
      ? await loadProofsByScheduleId(scheduleIds, supabase)
      : new Map<string, RepaymentProofSummary[]>();
  const schedulesByLoanId = new Map<string, RepaymentScheduleSummary[]>();

  scheduleRows.forEach((row) => {
    const schedule = schedulesByLoanId.get(row.active_loan_id) ?? [];
    schedulesByLoanId.set(row.active_loan_id, [
      ...schedule,
      mapRepaymentScheduleRow(row, proofsByScheduleId.get(row.id) ?? []),
    ]);
  });

  const channelsByLoanId = new Map<string, RepaymentChannelSummary[]>();

  (channelRows ?? []).forEach((row) => {
    const channels = channelsByLoanId.get(row.active_loan_id) ?? [];
    channelsByLoanId.set(row.active_loan_id, [
      ...channels,
      mapRepaymentChannelRow(row),
    ]);
  });

  return {
    ok: true,
    mode: "supabase",
    loans: loans.map((loan) =>
      mapActiveLoanRow(
        loan,
        schedulesByLoanId.get(loan.id) ?? [],
        channelsByLoanId.get(loan.id) ?? [],
      ),
    ),
    message: "Active loans loaded.",
  };
}

async function loadProofsByScheduleId(
  scheduleIds: string[],
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
) {
  const { data: proofRows, error } = await supabase
    .from("repayment_proofs")
    .select(repaymentProofSelect)
    .in("repayment_schedule_id", scheduleIds)
    .order("submitted_at", { ascending: false });

  const rows = proofRows ?? [];

  if (error || rows.length === 0) {
    return new Map<string, RepaymentProofSummary[]>();
  }

  const signedUrls = await Promise.all(
    rows.map((row) =>
      getRepaymentProofSignedUrl(supabase, row.storage_bucket, row.storage_path),
    ),
  );

  const proofsByScheduleId = new Map<string, RepaymentProofSummary[]>();

  for (let i = 0; i < rows.length; i++) {
    const summary = mapRepaymentProofRow(rows[i], signedUrls[i]);
    const existing = proofsByScheduleId.get(rows[i].repayment_schedule_id) ?? [];
    proofsByScheduleId.set(rows[i].repayment_schedule_id, [...existing, summary]);
  }

  return proofsByScheduleId;
}

function mapRepaymentProofRow(
  row: RepaymentProofRow,
  viewUrl: string | null,
): RepaymentProofSummary {
  return {
    id: row.id,
    status: row.status,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    reviewNotes: row.review_notes,
    viewUrl,
  };
}

export async function getRepaymentProofSignedUrl(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  storageBucket: string,
  storagePath: string,
): Promise<string | null> {
  const { data } = await supabase.storage
    .from(storageBucket)
    .createSignedUrl(storagePath, 300);

  return data?.signedUrl ?? null;
}
