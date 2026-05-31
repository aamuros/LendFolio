import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveSubmittedDateRangeFilters } from "../lib/date-ranges";
import {
  loadManagerApplications,
  loadManagerApplicationDetail,
  loadManagerAuditLogDetail,
  loadManagerAuditLogs,
  loadManagerLoanDetail,
  loadManagerLoans,
  loadManagerLookup,
  loadManagerOverview,
  loadManagerRepayments,
  loadManagerRepaymentProofDetail,
  loadManagerUserDetail,
  loadManagerUserDirectory,
} from "../lib/manager-operations";
import type { Database, Json } from "../lib/supabase/types";

const supabaseUrl =
  process.env.SUPABASE_TEST_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "";
const supabaseAnonKey =
  process.env.SUPABASE_TEST_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";
const supabaseServiceRoleKey =
  process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "";

const hasSupabaseLocalEnv =
  supabaseUrl.length > 0 &&
  supabaseAnonKey.length > 0 &&
  supabaseServiceRoleKey.length > 0 &&
  supabaseUrl.includes("127.0.0.1");

const describeSupabaseLocal = hasSupabaseLocalEnv ? describe : describe.skip;

const password = "LendFolio123!";
const ids = {
  borrower: "11111111-1111-1111-1111-111111111111",
  otherBorrower: "22222222-2222-2222-2222-222222222222",
  approvedLender: "33333333-3333-3333-3333-333333333333",
  partnerLender: "44444444-4444-4444-4444-444444444444",
  pendingLender: "55555555-5555-5555-5555-555555555555",
} as const;

type TestClient = SupabaseClient<Database>;
type InsertedRow = {
  id: string;
  status?: string;
};
type AcceptanceResult = {
  ok: boolean;
  message?: string;
  loan_application_id?: string;
  accepted_offer_id?: string;
  active_loan_id?: string;
  declined_offer_count?: number;
};
type OfferRpcResult = {
  ok: boolean;
  message?: string;
  offer_id?: string;
  loan_application_id?: string;
};
type LenderReviewRpcResult = {
  ok: boolean;
  message?: string;
  lender_profile_id?: string;
  verification_status?: string;
};
type RepaymentProofResult = {
  ok: boolean;
  message?: string;
  proof_id?: string;
  active_loan_id?: string;
  outstanding_balance?: number;
  loan_status?: string;
};

function toCents(value: number | string) {
  return Math.round(Number(value) * 100);
}

function createSupabaseClient(key: string): TestClient {
  return createClient<Database>(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }) as TestClient;
}

async function signIn(email: string): Promise<TestClient> {
  const client = createSupabaseClient(supabaseAnonKey);
  const { error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  expect(error).toBeNull();

  return client;
}

async function cleanWorkflowRows(admin: TestClient) {
  await admin
    .from("repayment_proofs")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  await admin
    .from("loan_repayment_schedules")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  await admin
    .from("active_loans")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  await admin.from("loan_offers").delete().in("borrower_id", [
    ids.borrower,
    ids.otherBorrower,
  ]);
  await admin.from("loan_applications").delete().in("borrower_id", [
    ids.borrower,
    ids.otherBorrower,
  ]);
  await admin.from("borrower_portfolios").delete().in("borrower_id", [
    ids.borrower,
    ids.otherBorrower,
  ]);
  await admin.from("audit_logs").delete().neq("action", "__keep_none__");
  await admin
    .from("lender_profiles")
    .update({
      min_loan_amount: 5000,
      max_loan_amount: 50000,
      verification_status: "approved",
      approved_at: "2026-05-26T00:00:00.000Z",
      approved_by: null,
      rejected_at: null,
      rejected_by: null,
      rejection_reason: null,
      manager_review_notes: null,
    })
    .in("user_id", [ids.approvedLender, ids.partnerLender]);
  await admin
    .from("lender_profiles")
    .update({
      verification_status: "pending",
      approved_at: null,
      approved_by: null,
      rejected_at: null,
      rejected_by: null,
      rejection_reason: null,
      manager_review_notes: null,
    })
    .eq("user_id", ids.pendingLender);
}

async function createPortfolioAndApplication(
  client: TestClient,
  borrowerId: string = ids.borrower,
  preferredTerm: Database["public"]["Enums"]["preferred_term"] = "3_months",
) {
  const { data: portfolio, error: portfolioError } = await client
    .from("borrower_portfolios")
    .insert({
      borrower_id: borrowerId,
      business_type: "sari_sari_store",
      location: "Quezon City",
      monthly_gross_revenue: 48000,
      monthly_expenses: 31000,
      existing_loan_payments: 2500,
      years_in_operation: 3,
      loan_purpose_context:
        "Working capital for inventory and supplier purchases during peak demand.",
    })
    .select("id")
    .single<InsertedRow>();

  expect(portfolioError).toBeNull();
  expect(portfolio?.id).toBeTruthy();
  if (!portfolio) {
    throw new Error("Expected borrower portfolio insert to return a row.");
  }

  const { data: application, error: applicationError } = await client
    .from("loan_applications")
    .insert({
      borrower_id: borrowerId,
      borrower_portfolio_id: portfolio.id,
      requested_amount: 25000,
      purpose: "Inventory restock",
      preferred_term: preferredTerm,
      remarks: "Review against current cash flow.",
    })
    .select("id, status")
    .single<InsertedRow>();

  expect(applicationError).toBeNull();
  expect(application).toMatchObject({ status: "submitted" });
  if (!application) {
    throw new Error("Expected loan application insert to return a row.");
  }

  return {
    portfolioId: portfolio.id as string,
    applicationId: application.id as string,
  };
}

async function createOffer(
  client: TestClient,
  _lenderId: string,
  applicationId: string,
  _lenderName: string,
  approvedAmount = 22000,
) {
  const { data: rpcData, error } = await client.rpc("create_loan_offer", {
    p_loan_application_id: applicationId,
    p_approved_amount: approvedAmount,
    p_repayment_amount: approvedAmount + 1800,
    p_fees: 500,
    p_due_date: "2026-08-24",
    p_remarks: "Offer based on submitted business profile.",
  });

  const result = rpcData as Json as OfferRpcResult | null;

  if (error || !result?.ok || !result.offer_id) {
    return { data: null, error, result };
  }

  const { data, error: offerError } = await client
    .from("loan_offers")
    .select("id, status")
    .eq("id", result.offer_id)
    .single<InsertedRow>();

  return { data, error: offerError, result };
}

async function acceptOfferAndLoadActiveLoan(
  borrower: TestClient,
  offerId: string,
  applicationId: string,
) {
  const acceptance = await borrower.rpc("accept_loan_offer", {
    p_offer_id: offerId,
  });

  expect(acceptance.error).toBeNull();
  expect((acceptance.data as Json as AcceptanceResult).ok).toBe(true);

  const { data: activeLoan, error: activeLoanError } = await borrower
    .from("active_loans")
    .select("id, lender_id")
    .eq("loan_application_id", applicationId)
    .single();

  expect(activeLoanError).toBeNull();
  expect(activeLoan?.id).toBeTruthy();

  return {
    activeLoanId: activeLoan?.id as string,
  };
}

async function createAcceptedLoanWithSchedule(
  borrowerClient: TestClient,
  lenderClient: TestClient,
) {
  const { applicationId } = await createPortfolioAndApplication(
    borrowerClient,
    ids.borrower,
    "1_month",
  );
  const offer = await createOffer(
    lenderClient,
    ids.approvedLender,
    applicationId,
    "Approved Capital",
  );

  expect(offer.error).toBeNull();
  if (!offer.data) {
    throw new Error("Expected offer insert to return a row.");
  }

  const { activeLoanId } = await acceptOfferAndLoadActiveLoan(
    borrowerClient,
    offer.data.id,
    applicationId,
  );

  const { data: schedule, error: scheduleError } = await borrowerClient
    .from("loan_repayment_schedules")
    .select("id, amount_due")
    .eq("active_loan_id", activeLoanId)
    .single();

  expect(scheduleError).toBeNull();
  expect(schedule?.id).toBeTruthy();

  return {
    applicationId,
    offerId: offer.data.id as string,
    activeLoanId,
    repaymentScheduleId: schedule?.id as string,
    amountDue: Number(schedule?.amount_due),
  };
}

async function createAcceptedLoanWithTerm(
  borrowerClient: TestClient,
  lenderClient: TestClient,
  preferredTerm: Database["public"]["Enums"]["preferred_term"],
  repaymentAmount = 23801,
) {
  const { applicationId } = await createPortfolioAndApplication(
    borrowerClient,
    ids.borrower,
    preferredTerm,
  );
  const offer = await createOffer(
    lenderClient,
    ids.approvedLender,
    applicationId,
    "Approved Capital",
    repaymentAmount - 1800,
  );

  expect(offer.error).toBeNull();
  if (!offer.data) {
    throw new Error("Expected offer insert to return a row.");
  }

  const { activeLoanId } = await acceptOfferAndLoadActiveLoan(
    borrowerClient,
    offer.data.id,
    applicationId,
  );

  const { data: schedules, error: schedulesError } = await borrowerClient
    .from("loan_repayment_schedules")
    .select("id, installment_number, amount_due, due_date, status")
    .eq("active_loan_id", activeLoanId)
    .order("installment_number");

  expect(schedulesError).toBeNull();

  return {
    applicationId,
    offerId: offer.data.id as string,
    activeLoanId,
    schedules: schedules ?? [],
    repaymentAmount,
  };
}

async function submitProofForSchedule(
  client: TestClient,
  repaymentScheduleId: string,
  activeLoanId: string,
  borrowerId: string = ids.borrower,
  suffix = crypto.randomUUID(),
) {
  const result = await client.rpc("submit_repayment_proof", {
    p_repayment_schedule_id: repaymentScheduleId,
    p_storage_path: `borrowers/${borrowerId}/loans/${activeLoanId}/repayments/${repaymentScheduleId}/${suffix}-proof.pdf`,
    p_file_name: "proof.pdf",
    p_file_type: "application/pdf",
    p_file_size: 1024,
  });

  expect(result.error).toBeNull();

  return result.data as Json as RepaymentProofResult;
}

describeSupabaseLocal("Supabase local role, RLS, audit, and offer workflow", () => {
  let admin: TestClient;
  let borrower: TestClient;
  let otherBorrower: TestClient;
  let approvedLender: TestClient;
  let partnerLender: TestClient;
  let pendingLender: TestClient;
  let manager: TestClient;

  beforeAll(async () => {
    admin = createSupabaseClient(supabaseServiceRoleKey);
    borrower = await signIn("borrower@lendfolio.local");
    otherBorrower = await signIn("borrower.alt@lendfolio.local");
    approvedLender = await signIn("lender@lendfolio.local");
    partnerLender = await signIn("lender.partner@lendfolio.local");
    pendingLender = await signIn("lender.pending@lendfolio.local");
    manager = await signIn("manager@lendfolio.local");
  });

  beforeEach(async () => {
    await cleanWorkflowRows(admin);
  });

  it("provisions minimal lender signup as incomplete when review details are absent", async () => {
    const email = `minimal-lender-${crypto.randomUUID()}@lendfolio.local`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        lendfolio_role: "lender",
        display_name: "Minimal Lender",
      },
    });

    expect(error).toBeNull();
    expect(data.user?.id).toBeTruthy();
    const userId = data.user?.id;
    if (!userId) {
      throw new Error("Expected created lender user.");
    }

    try {
      const { data: lenderProfile, error: lenderProfileError } = await admin
        .from("lender_profiles")
        .select("verification_status, organization_name, min_loan_amount, max_loan_amount")
        .eq("user_id", userId)
        .single();

      expect(lenderProfileError).toBeNull();
      expect(lenderProfile).toMatchObject({
        verification_status: "incomplete",
        organization_name: null,
        min_loan_amount: null,
        max_loan_amount: null,
      });
    } finally {
      await admin.auth.admin.deleteUser(userId);
    }
  });

  it.each(["incomplete", "rejected"] as const)(
    "moves %s lender onboarding to pending and logs the real previous status",
    async (previousStatus) => {
      const { data: lenderProfile, error: profileError } = await admin
        .from("lender_profiles")
        .update({
          verification_status: previousStatus,
          rejection_reason:
            previousStatus === "rejected" ? "Needs updated details." : null,
          rejected_at:
            previousStatus === "rejected"
              ? "2026-05-26T00:00:00.000Z"
              : null,
        })
        .eq("user_id", ids.pendingLender)
        .select("id")
        .single();

      expect(profileError).toBeNull();
      expect(lenderProfile?.id).toBeTruthy();

      const submission = await pendingLender.rpc("submit_lender_onboarding", {
        p_organization_name: "Resubmitted Lending",
        p_contact_person: "Maria Santos",
        p_phone_number: "+63 917 000 0000",
        p_business_address: "123 Review Street, Quezon City",
        p_operating_area: "Metro Manila",
        p_business_registration_number: null,
        p_min_loan_amount: 5000,
        p_max_loan_amount: 50000,
        p_typical_repayment_terms: "1 to 6 months",
        p_lender_description:
          "We support micro-business borrowers with documented working capital loans.",
      });

      expect(submission.error).toBeNull();
      expect(submission.data as Json as LenderReviewRpcResult).toMatchObject({
        ok: true,
        verification_status: "pending",
      });

      const { data: updatedProfile, error: updatedProfileError } = await admin
        .from("lender_profiles")
        .select("verification_status")
        .eq("id", lenderProfile?.id ?? "")
        .single();

      expect(updatedProfileError).toBeNull();
      expect(updatedProfile?.verification_status).toBe("pending");

      const { data: auditLog, error: auditLogError } = await admin
        .from("audit_logs")
        .select("metadata")
        .eq("action", "lender_onboarding_submitted")
        .eq("target_id", lenderProfile?.id ?? "")
        .single();

      expect(auditLogError).toBeNull();
      expect(auditLog?.metadata).toMatchObject({
        previous_status: previousStatus,
        new_status: "pending",
      });
    },
  );

  it("prevents manager approval without current lender review consent", async () => {
    const { data: lenderProfile, error: profileError } = await admin
      .from("lender_profiles")
      .update({
        organization_name: "Pending Lending",
        contact_person: "Pending Contact",
        phone_number: "+63 917 111 1111",
        business_address: "456 Review Street, Makati",
        operating_area: "Metro Manila",
        min_loan_amount: 5000,
        max_loan_amount: 50000,
        typical_repayment_terms: "1 to 6 months",
        lender_description:
          "Pending lender profile with sufficient information for manager review.",
        verification_status: "pending",
      })
      .eq("user_id", ids.pendingLender)
      .select("id")
      .single();

    expect(profileError).toBeNull();
    expect(lenderProfile?.id).toBeTruthy();

    await admin
      .from("user_consents")
      .delete()
      .eq("user_id", ids.pendingLender)
      .eq("consent_type", "lender_review_consent");

    const review = await manager.rpc("review_lender_verification", {
      p_lender_profile_id: lenderProfile?.id ?? "",
      p_decision: "approve",
      p_manager_review_notes: "Looks ready.",
      p_rejection_reason: null,
    });

    expect(review.error).toBeNull();
    expect(review.data as Json as LenderReviewRpcResult).toMatchObject({
      ok: false,
      message: "Lender must accept the required disclosures before approval.",
    });
  });

  it("enforces borrower isolation, lender approval, manager visibility, and audit creation", async () => {
    const { portfolioId, applicationId } =
      await createPortfolioAndApplication(borrower);

    const { data: otherBorrowerPortfolios, error: otherPortfolioError } =
      await otherBorrower
        .from("borrower_portfolios")
        .select("id")
        .eq("id", portfolioId);

    expect(otherPortfolioError).toBeNull();
    expect(otherBorrowerPortfolios).toEqual([]);

    const { data: otherBorrowerApplications, error: otherApplicationError } =
      await otherBorrower
        .from("loan_applications")
        .select("id")
        .eq("id", applicationId);

    expect(otherApplicationError).toBeNull();
    expect(otherBorrowerApplications).toEqual([]);

    const { data: lenderApplications, error: lenderApplicationError } =
      await approvedLender
        .from("loan_applications")
        .select("id")
        .eq("id", applicationId);

    expect(lenderApplicationError).toBeNull();
    expect(lenderApplications).toHaveLength(1);

    const blockedOffer = await createOffer(
      pendingLender,
      ids.pendingLender,
      applicationId,
      "Pending Capital",
    );

    expect(blockedOffer.data).toBeNull();
    expect(blockedOffer.error).toBeNull();
    expect(blockedOffer.result).toMatchObject({ ok: false });

    const approvedOffer = await createOffer(
      approvedLender,
      ids.approvedLender,
      applicationId,
      "Approved Capital",
    );

    expect(approvedOffer.error).toBeNull();
    expect(approvedOffer.data).toMatchObject({ status: "pending" });

    const { data: managerAuditLogs, error: auditError } = await manager
      .from("audit_logs")
      .select("action, target_table")
      .in("action", ["application_submitted", "offer_created"]);

    expect(auditError).toBeNull();
    expect(managerAuditLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "application_submitted",
          target_table: "loan_applications",
        }),
        expect.objectContaining({
          action: "offer_created",
          target_table: "loan_offers",
        }),
      ]),
    );
  });

  it("creates lender offers through the RPC and preserves offer audit logging", async () => {
    const { applicationId } = await createPortfolioAndApplication(borrower);

    const offer = await createOffer(
      approvedLender,
      ids.approvedLender,
      applicationId,
      "Approved Capital",
    );

    expect(offer.error).toBeNull();
    expect(offer.result).toMatchObject({
      ok: true,
      loan_application_id: applicationId,
    });
    expect(offer.result?.offer_id).toBeTruthy();
    expect(offer.data).toMatchObject({ status: "pending" });

    const { data: auditLogs, error: auditError } = await manager
      .from("audit_logs")
      .select("action, target_table, target_id")
      .eq("action", "offer_created")
      .eq("target_id", offer.result?.offer_id ?? "");

    expect(auditError).toBeNull();
    expect(auditLogs).toEqual([
      expect.objectContaining({
        action: "offer_created",
        target_table: "loan_offers",
      }),
    ]);
  });

  it("blocks invalid offer creation through the RPC", async () => {
    const { applicationId } = await createPortfolioAndApplication(borrower);

    const pendingOffer = await createOffer(
      pendingLender,
      ids.pendingLender,
      applicationId,
      "Pending Capital",
    );
    expect(pendingOffer.error).toBeNull();
    expect(pendingOffer.result).toMatchObject({ ok: false });

    const borrowerOffer = await borrower.rpc("create_loan_offer", {
      p_loan_application_id: applicationId,
      p_approved_amount: 22000,
      p_repayment_amount: 23800,
      p_fees: 500,
      p_due_date: "2026-08-24",
      p_remarks: "",
    });
    expect(borrowerOffer.error).toBeNull();
    expect(borrowerOffer.data as Json as OfferRpcResult).toMatchObject({
      ok: false,
      message: "Only approved lenders can send offers.",
    });

    const pastDueDate = await approvedLender.rpc("create_loan_offer", {
      p_loan_application_id: applicationId,
      p_approved_amount: 23000,
      p_repayment_amount: 24800,
      p_fees: 500,
      p_due_date: "2020-01-01",
      p_remarks: "",
    });
    expect(pastDueDate.error).toBeNull();
    expect(pastDueDate.data as Json as OfferRpcResult).toMatchObject({
      ok: false,
      message: "Choose a future due date.",
    });

    const today = new Date().toISOString().slice(0, 10);
    const todayDueDate = await approvedLender.rpc("create_loan_offer", {
      p_loan_application_id: applicationId,
      p_approved_amount: 23000,
      p_repayment_amount: 24800,
      p_fees: 500,
      p_due_date: today,
      p_remarks: "",
    });
    expect(todayDueDate.error).toBeNull();
    expect(todayDueDate.data as Json as OfferRpcResult).toMatchObject({
      ok: false,
      message: "Choose a future due date.",
    });

    const repaymentBelowPrincipalAndFees = await approvedLender.rpc(
      "create_loan_offer",
      {
        p_loan_application_id: applicationId,
        p_approved_amount: 23000,
        p_repayment_amount: 23200,
        p_fees: 500,
        p_due_date: "2026-08-24",
        p_remarks: "",
      },
    );
    expect(repaymentBelowPrincipalAndFees.error).toBeNull();
    expect(
      repaymentBelowPrincipalAndFees.data as Json as OfferRpcResult,
    ).toMatchObject({
      ok: false,
      message: "Total repayment must include the approved amount and fees.",
    });
  });

  it("enforces the approved lender configured min and max loan range", async () => {
    const { applicationId } = await createPortfolioAndApplication(borrower);

    const { error: rangeUpdateError } = await admin
      .from("lender_profiles")
      .update({
        min_loan_amount: 10000,
        max_loan_amount: 20000,
      })
      .eq("user_id", ids.approvedLender);

    expect(rangeUpdateError).toBeNull();

    const belowMin = await approvedLender.rpc("create_loan_offer", {
      p_loan_application_id: applicationId,
      p_approved_amount: 8000,
      p_repayment_amount: 9000,
      p_fees: 500,
      p_due_date: "2026-08-24",
      p_remarks: "",
    });
    expect(belowMin.error).toBeNull();
    expect(belowMin.data as Json as OfferRpcResult).toMatchObject({
      ok: false,
      message: "Approved amount is below your configured minimum loan amount.",
    });

    const aboveMax = await approvedLender.rpc("create_loan_offer", {
      p_loan_application_id: applicationId,
      p_approved_amount: 22000,
      p_repayment_amount: 23800,
      p_fees: 500,
      p_due_date: "2026-08-24",
      p_remarks: "",
    });
    expect(aboveMax.error).toBeNull();
    expect(aboveMax.data as Json as OfferRpcResult).toMatchObject({
      ok: false,
      message: "Approved amount exceeds your configured maximum loan amount.",
    });

    const withinRange = await approvedLender.rpc("create_loan_offer", {
      p_loan_application_id: applicationId,
      p_approved_amount: 18000,
      p_repayment_amount: 19800,
      p_fees: 500,
      p_due_date: "2026-08-24",
      p_remarks: "",
    });
    expect(withinRange.error).toBeNull();
    expect(withinRange.data as Json as OfferRpcResult).toMatchObject({
      ok: true,
      loan_application_id: applicationId,
    });
  });

  it("accepts only one competing offer atomically and records workflow audit logs", async () => {
    const { applicationId } = await createPortfolioAndApplication(borrower);

    const firstOffer = await createOffer(
      approvedLender,
      ids.approvedLender,
      applicationId,
      "Approved Capital",
      22000,
    );
    const secondOffer = await createOffer(
      partnerLender,
      ids.partnerLender,
      applicationId,
      "Partner Capital",
      23000,
    );

    expect(firstOffer.error).toBeNull();
    expect(secondOffer.error).toBeNull();
    if (!firstOffer.data || !secondOffer.data) {
      throw new Error("Expected competing offer inserts to return rows.");
    }

    const [firstAcceptance, secondAcceptance] = await Promise.all([
      borrower.rpc("accept_loan_offer", {
        p_offer_id: firstOffer.data.id,
      }),
      borrower.rpc("accept_loan_offer", {
        p_offer_id: secondOffer.data.id,
      }),
    ]);

    expect(firstAcceptance.error).toBeNull();
    expect(secondAcceptance.error).toBeNull();

    const acceptanceResults = [
      firstAcceptance.data,
      secondAcceptance.data,
    ] as Json[] as AcceptanceResult[];
    expect(
      acceptanceResults.filter((result) => result?.ok === true),
    ).toHaveLength(1);
    expect(
      acceptanceResults.filter((result) => result?.ok === false),
    ).toHaveLength(1);

    const { data: offers, error: offersError } = await borrower
      .from("loan_offers")
      .select("id, status, lender_id")
      .eq("loan_application_id", applicationId);

    expect(offersError).toBeNull();
    expect(offers?.filter((offer) => offer.status === "accepted")).toHaveLength(
      1,
    );
    expect(offers?.filter((offer) => offer.status === "declined")).toHaveLength(
      1,
    );
    const acceptedOffer = offers?.find((offer) => offer.status === "accepted");
    expect(acceptedOffer?.id).toBeTruthy();

    const { data: application, error: applicationError } = await borrower
      .from("loan_applications")
      .select("status")
      .eq("id", applicationId)
      .single();

    expect(applicationError).toBeNull();
    expect(application).toMatchObject({ status: "accepted" });

    const successfulAcceptance = acceptanceResults.find(
      (result) => result?.ok === true,
    );
    expect(successfulAcceptance).toMatchObject({
      loan_application_id: applicationId,
      accepted_offer_id: acceptedOffer?.id,
      declined_offer_count: 1,
    });
    expect(successfulAcceptance?.active_loan_id).toBeTruthy();

    const { data: activeLoans, error: activeLoansError } = await borrower
      .from("active_loans")
      .select(
        "id, loan_application_id, accepted_offer_id, borrower_id, lender_id, principal_amount, repayment_amount, fees, outstanding_balance, status, due_date",
      )
      .eq("loan_application_id", applicationId);

    expect(activeLoansError).toBeNull();
    expect(activeLoans).toHaveLength(1);
    expect(activeLoans?.[0]).toMatchObject({
      loan_application_id: applicationId,
      accepted_offer_id: acceptedOffer?.id,
      borrower_id: ids.borrower,
      lender_id: acceptedOffer?.lender_id,
      principal_amount: acceptedOffer?.id === firstOffer.data.id ? 22000 : 23000,
      fees: 500,
      status: "active",
      due_date: "2026-08-24",
    });
    expect(Number(activeLoans?.[0].repayment_amount)).toBe(
      Number(activeLoans?.[0].outstanding_balance),
    );
    expect(Number(activeLoans?.[0].repayment_amount)).toBe(
      Number(activeLoans?.[0].principal_amount) + 1800,
    );

    const activeLoanId = activeLoans?.[0].id;
    expect(activeLoanId).toBe(successfulAcceptance?.active_loan_id);

    const { data: schedule, error: scheduleError } = await borrower
      .from("loan_repayment_schedules")
      .select(
        "active_loan_id, borrower_id, lender_id, installment_number, amount_due, due_date, status",
      )
      .eq("active_loan_id", activeLoanId ?? "")
      .order("installment_number");

    expect(scheduleError).toBeNull();
    expect(schedule).toHaveLength(3);
    expect(schedule?.map((row) => row.installment_number)).toEqual([1, 2, 3]);
    expect(schedule?.at(-1)).toMatchObject({
      active_loan_id: activeLoanId,
      borrower_id: ids.borrower,
      lender_id: acceptedOffer?.lender_id,
      installment_number: 3,
      due_date: "2026-08-24",
      status: "due",
    });
    expect(
      schedule?.reduce((total, row) => total + toCents(row.amount_due), 0),
    ).toBe(toCents(activeLoans?.[0].repayment_amount ?? 0));

    if (!acceptedOffer) {
      throw new Error("Expected an accepted offer.");
    }

    const duplicateAcceptance = await borrower.rpc("accept_loan_offer", {
      p_offer_id: acceptedOffer.id,
    });

    expect(duplicateAcceptance.error).toBeNull();
    expect((duplicateAcceptance.data as Json as AcceptanceResult)).toMatchObject({
      ok: true,
      active_loan_id: activeLoanId,
    });

    const { data: duplicateCheck, error: duplicateCheckError } = await manager
      .from("active_loans")
      .select("id")
      .eq("loan_application_id", applicationId);

    expect(duplicateCheckError).toBeNull();
    expect(duplicateCheck).toHaveLength(1);

    const { data: duplicateScheduleCheck, error: duplicateScheduleError } =
      await manager
        .from("loan_repayment_schedules")
        .select("id")
        .eq("active_loan_id", activeLoanId ?? "");

    expect(duplicateScheduleError).toBeNull();
    expect(duplicateScheduleCheck).toHaveLength(3);

    const { data: borrowerReadableLoan, error: borrowerLoanReadError } =
      await borrower
        .from("active_loans")
        .select("id")
        .eq("id", activeLoanId ?? "");
    expect(borrowerLoanReadError).toBeNull();
    expect(borrowerReadableLoan).toHaveLength(1);

    const acceptedLenderClient =
      acceptedOffer.lender_id === ids.approvedLender
        ? approvedLender
        : partnerLender;
    const unrelatedLenderClient =
      acceptedOffer.lender_id === ids.approvedLender
        ? partnerLender
        : approvedLender;

    const { data: lenderReadableLoan, error: lenderLoanReadError } =
      await acceptedLenderClient
        .from("active_loans")
        .select("id")
        .eq("id", activeLoanId ?? "");
    expect(lenderLoanReadError).toBeNull();
    expect(lenderReadableLoan).toHaveLength(1);

    const { data: managerReadableLoan, error: managerLoanReadError } =
      await manager
        .from("active_loans")
        .select("id")
        .eq("id", activeLoanId ?? "");
    expect(managerLoanReadError).toBeNull();
    expect(managerReadableLoan).toHaveLength(1);

    const { data: otherBorrowerLoan, error: otherBorrowerLoanError } =
      await otherBorrower
        .from("active_loans")
        .select("id")
        .eq("id", activeLoanId ?? "");
    expect(otherBorrowerLoanError).toBeNull();
    expect(otherBorrowerLoan).toEqual([]);

    const { data: unrelatedLenderLoan, error: unrelatedLenderLoanError } =
      await unrelatedLenderClient
        .from("active_loans")
        .select("id")
        .eq("id", activeLoanId ?? "");
    expect(unrelatedLenderLoanError).toBeNull();
    expect(unrelatedLenderLoan).toEqual([]);

    const blockedOfferAfterAcceptance = await createOffer(
      acceptedLenderClient,
      acceptedOffer.lender_id,
      applicationId,
      "Closed Application Capital",
      24000,
    );

    expect(blockedOfferAfterAcceptance.data).toBeNull();
    expect(blockedOfferAfterAcceptance.error).toBeNull();
    expect(blockedOfferAfterAcceptance.result).toMatchObject({
      ok: false,
      message: "This application is not open for offers.",
    });

    const { data: auditLogs, error: auditError } = await manager
      .from("audit_logs")
      .select("action")
      .in("action", [
        "offer_accepted",
        "competing_offers_declined",
        "application_accepted",
        "loan_activated",
        "repayment_schedule_created",
      ]);

    expect(auditError).toBeNull();
    expect(auditLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "offer_accepted" }),
        expect.objectContaining({ action: "competing_offers_declined" }),
        expect.objectContaining({ action: "application_accepted" }),
        expect.objectContaining({ action: "loan_activated" }),
        expect.objectContaining({ action: "repayment_schedule_created" }),
      ]),
    );
  });

  it("lets borrowers edit only open applications and withdraw without deletion", async () => {
    const { applicationId } = await createPortfolioAndApplication(borrower);

    const updateResult = await borrower.rpc("update_loan_application", {
      p_application_id: applicationId,
      p_requested_amount: 30000,
      p_purpose: "Inventory restock and display repairs",
      p_preferred_term: "6_months",
      p_remarks: "Updated after checking supplier estimates.",
    });

    expect(updateResult.error).toBeNull();
    expect((updateResult.data as Json as AcceptanceResult).ok).toBe(true);

    const withdrawResult = await borrower.rpc("withdraw_loan_application", {
      p_application_id: applicationId,
    });

    expect(withdrawResult.error).toBeNull();
    expect((withdrawResult.data as Json as AcceptanceResult).ok).toBe(true);

    const closedUpdateResult = await borrower.rpc("update_loan_application", {
      p_application_id: applicationId,
      p_requested_amount: 35000,
      p_purpose: "Inventory restock and display repairs",
      p_preferred_term: "6_months",
      p_remarks: "",
    });

    expect(closedUpdateResult.error).toBeNull();
    expect((closedUpdateResult.data as Json as AcceptanceResult).ok).toBe(false);

    const { data: application, error: applicationError } = await borrower
      .from("loan_applications")
      .select("id, status")
      .eq("id", applicationId)
      .single();

    expect(applicationError).toBeNull();
    expect(application).toMatchObject({ id: applicationId, status: "withdrawn" });
  });

  it("keeps withdrawn applications out of the lender queue and blocks new offers", async () => {
    const { applicationId } = await createPortfolioAndApplication(borrower);

    const withdrawResult = await borrower.rpc("withdraw_loan_application", {
      p_application_id: applicationId,
    });

    expect(withdrawResult.error).toBeNull();

    const { data: lenderApplications, error: lenderApplicationError } =
      await approvedLender
        .from("loan_applications")
        .select("id")
        .eq("id", applicationId);

    expect(lenderApplicationError).toBeNull();
    expect(lenderApplications).toEqual([]);

    const blockedOffer = await createOffer(
      approvedLender,
      ids.approvedLender,
      applicationId,
      "Approved Capital",
    );

    expect(blockedOffer.data).toBeNull();
    expect(blockedOffer.error).toBeNull();
    expect(blockedOffer.result).toMatchObject({
      ok: false,
      message: "This application is not open for offers.",
    });
  });

  it("lets a borrower decline a pending offer and prevents later acceptance", async () => {
    const { applicationId } = await createPortfolioAndApplication(borrower);
    const offer = await createOffer(
      approvedLender,
      ids.approvedLender,
      applicationId,
      "Approved Capital",
    );

    expect(offer.error).toBeNull();
    if (!offer.data) {
      throw new Error("Expected offer insert to return a row.");
    }

    const declineResult = await borrower.rpc("decline_loan_offer", {
      p_offer_id: offer.data.id,
    });

    expect(declineResult.error).toBeNull();
    expect((declineResult.data as Json as AcceptanceResult).ok).toBe(true);

    const acceptanceResult = await borrower.rpc("accept_loan_offer", {
      p_offer_id: offer.data.id,
    });

    expect(acceptanceResult.error).toBeNull();
    expect((acceptanceResult.data as Json as AcceptanceResult).ok).toBe(false);

    const { data: auditLogs, error: auditError } = await manager
      .from("audit_logs")
      .select("action")
      .eq("action", "offer_declined");

    expect(auditError).toBeNull();
    expect(auditLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "offer_declined" }),
      ]),
    );
  });

  it("prevents a borrower from declining another borrower's offer", async () => {
    const { applicationId } = await createPortfolioAndApplication(borrower);
    const offer = await createOffer(
      approvedLender,
      ids.approvedLender,
      applicationId,
      "Approved Capital",
    );

    expect(offer.error).toBeNull();
    if (!offer.data) {
      throw new Error("Expected offer insert to return a row.");
    }

    const declineResult = await otherBorrower.rpc("decline_loan_offer", {
      p_offer_id: offer.data.id,
    });

    expect(declineResult.error).toBeNull();
    expect((declineResult.data as Json as AcceptanceResult).ok).toBe(false);

    const { data: offerAfterDecline, error } = await borrower
      .from("loan_offers")
      .select("status")
      .eq("id", offer.data.id)
      .single();

    expect(error).toBeNull();
    expect(offerAfterDecline).toMatchObject({ status: "pending" });
  });

  it("lets the accepted-offer lender read closed application and profile context", async () => {
    const { portfolioId, applicationId } =
      await createPortfolioAndApplication(borrower);
    const offer = await createOffer(
      approvedLender,
      ids.approvedLender,
      applicationId,
      "Approved Capital",
    );

    expect(offer.error).toBeNull();
    if (!offer.data) {
      throw new Error("Expected offer insert to return a row.");
    }

    await acceptOfferAndLoadActiveLoan(borrower, offer.data.id, applicationId);

    const { data: application, error: applicationError } = await approvedLender
      .from("loan_applications")
      .select("id, status, requested_amount, purpose, submitted_at, borrower_portfolio_id")
      .eq("id", applicationId)
      .single();

    expect(applicationError).toBeNull();
    expect(application).toMatchObject({
      id: applicationId,
      status: "accepted",
      requested_amount: 25000,
      purpose: "Inventory restock",
    });

    const { data: portfolio, error: portfolioError } = await approvedLender
      .from("borrower_portfolios")
      .select("id, business_type, location")
      .eq("id", portfolioId)
      .single();

    expect(portfolioError).toBeNull();
    expect(portfolio).toMatchObject({
      id: portfolioId,
      business_type: "sari_sari_store",
      location: "Quezon City",
    });

    const { data: borrowerApplication, error: borrowerApplicationError } =
      await borrower
        .from("loan_applications")
        .select("id")
        .eq("id", applicationId);
    expect(borrowerApplicationError).toBeNull();
    expect(borrowerApplication).toHaveLength(1);

    const { data: borrowerPortfolio, error: borrowerPortfolioError } =
      await borrower
        .from("borrower_portfolios")
        .select("id")
        .eq("id", portfolioId);
    expect(borrowerPortfolioError).toBeNull();
    expect(borrowerPortfolio).toHaveLength(1);

    const { data: managerApplication, error: managerApplicationError } =
      await manager
        .from("loan_applications")
        .select("id")
        .eq("id", applicationId);
    expect(managerApplicationError).toBeNull();
    expect(managerApplication).toHaveLength(1);

    const { data: managerPortfolio, error: managerPortfolioError } =
      await manager
        .from("borrower_portfolios")
        .select("id")
        .eq("id", portfolioId);
    expect(managerPortfolioError).toBeNull();
    expect(managerPortfolio).toHaveLength(1);
  });

  it("blocks unrelated and pending lenders from closed application, portfolio, and active loan context", async () => {
    const { portfolioId, applicationId } =
      await createPortfolioAndApplication(borrower);
    const offer = await createOffer(
      approvedLender,
      ids.approvedLender,
      applicationId,
      "Approved Capital",
    );

    expect(offer.error).toBeNull();
    if (!offer.data) {
      throw new Error("Expected offer insert to return a row.");
    }

    const { activeLoanId } = await acceptOfferAndLoadActiveLoan(
      borrower,
      offer.data.id,
      applicationId,
    );

    const { data: application, error: applicationError } = await partnerLender
      .from("loan_applications")
      .select("id")
      .eq("id", applicationId);

    expect(applicationError).toBeNull();
    expect(application).toEqual([]);

    const { data: portfolio, error: portfolioError } = await partnerLender
      .from("borrower_portfolios")
      .select("id")
      .eq("id", portfolioId);

    expect(portfolioError).toBeNull();
    expect(portfolio).toEqual([]);

    const { data: activeLoan, error: activeLoanError } = await partnerLender
      .from("active_loans")
      .select("id")
      .eq("id", activeLoanId);

    expect(activeLoanError).toBeNull();
    expect(activeLoan).toEqual([]);

    const { data: pendingApplication, error: pendingApplicationError } =
      await pendingLender
        .from("loan_applications")
        .select("id")
        .eq("id", applicationId);
    expect(pendingApplicationError).toBeNull();
    expect(pendingApplication).toEqual([]);

    const { data: pendingPortfolio, error: pendingPortfolioError } =
      await pendingLender
        .from("borrower_portfolios")
        .select("id")
        .eq("id", portfolioId);
    expect(pendingPortfolioError).toBeNull();
    expect(pendingPortfolio).toEqual([]);
  });

  it("blocks duplicate pending offers from the same lender at the database level", async () => {
    const { applicationId } = await createPortfolioAndApplication(borrower);
    const firstOffer = await createOffer(
      approvedLender,
      ids.approvedLender,
      applicationId,
      "Approved Capital",
    );

    expect(firstOffer.error).toBeNull();
    expect(firstOffer.data).toMatchObject({ status: "pending" });

    const secondOffer = await createOffer(
      approvedLender,
      ids.approvedLender,
      applicationId,
      "Approved Capital",
      23000,
    );

    expect(secondOffer.data).toBeNull();
    expect(secondOffer.error).toBeNull();
    expect(secondOffer.result).toMatchObject({
      ok: false,
      message: "You already have a pending offer for this application.",
    });

    const { data: pendingOffers, error: pendingOffersError } = await manager
      .from("loan_offers")
      .select("id")
      .eq("loan_application_id", applicationId)
      .eq("lender_id", ids.approvedLender)
      .eq("status", "pending");

    expect(pendingOffersError).toBeNull();
    expect(pendingOffers).toHaveLength(1);
  });

  it("enforces repayment schedule RLS for borrower, lender, unrelated users, and manager", async () => {
    const { applicationId } = await createPortfolioAndApplication(borrower);
    const offer = await createOffer(
      approvedLender,
      ids.approvedLender,
      applicationId,
      "Approved Capital",
    );

    expect(offer.error).toBeNull();
    if (!offer.data) {
      throw new Error("Expected offer insert to return a row.");
    }

    const { activeLoanId } = await acceptOfferAndLoadActiveLoan(
      borrower,
      offer.data.id,
      applicationId,
    );

    const scheduleSelect =
      "id, active_loan_id, borrower_id, lender_id, installment_number, amount_due, due_date, status";

    const { data: borrowerSchedule, error: borrowerScheduleError } =
      await borrower
        .from("loan_repayment_schedules")
        .select(scheduleSelect)
        .eq("active_loan_id", activeLoanId);
    expect(borrowerScheduleError).toBeNull();
    expect(borrowerSchedule).toHaveLength(3);

    const { data: lenderSchedule, error: lenderScheduleError } =
      await approvedLender
        .from("loan_repayment_schedules")
        .select(scheduleSelect)
        .eq("active_loan_id", activeLoanId);
    expect(lenderScheduleError).toBeNull();
    expect(lenderSchedule).toHaveLength(3);

    const { data: otherBorrowerSchedule, error: otherBorrowerScheduleError } =
      await otherBorrower
        .from("loan_repayment_schedules")
        .select(scheduleSelect)
        .eq("active_loan_id", activeLoanId);
    expect(otherBorrowerScheduleError).toBeNull();
    expect(otherBorrowerSchedule).toEqual([]);

    const { data: unrelatedLenderSchedule, error: unrelatedLenderScheduleError } =
      await partnerLender
        .from("loan_repayment_schedules")
        .select(scheduleSelect)
        .eq("active_loan_id", activeLoanId);
    expect(unrelatedLenderScheduleError).toBeNull();
    expect(unrelatedLenderSchedule).toEqual([]);

    const { data: managerSchedule, error: managerScheduleError } = await manager
      .from("loan_repayment_schedules")
      .select(scheduleSelect)
      .eq("active_loan_id", activeLoanId);
    expect(managerScheduleError).toBeNull();
    expect(managerSchedule).toHaveLength(3);
  });

  it("creates repayment schedules from the application preferred term", async () => {
    const cases: Array<[
      Database["public"]["Enums"]["preferred_term"],
      number,
    ]> = [
      ["1_month", 1],
      ["3_months", 3],
      ["6_months", 6],
      ["12_months", 12],
    ];

    for (const [preferredTerm, installmentCount] of cases) {
      await cleanWorkflowRows(admin);

      const { offerId, activeLoanId, schedules, repaymentAmount } =
        await createAcceptedLoanWithTerm(
          borrower,
          approvedLender,
          preferredTerm,
          23801,
        );

      expect(schedules).toHaveLength(installmentCount);
      expect(schedules.map((row) => row.installment_number)).toEqual(
        Array.from({ length: installmentCount }, (_value, index) => index + 1),
      );
      expect(schedules.at(-1)?.due_date).toBe("2026-08-24");
      expect(
        schedules.reduce((total, row) => total + toCents(row.amount_due), 0),
      ).toBe(toCents(repaymentAmount));

      const duplicateAcceptance = await borrower.rpc("accept_loan_offer", {
        p_offer_id: offerId,
      });
      expect(duplicateAcceptance.error).toBeNull();
      expect(duplicateAcceptance.data as Json as AcceptanceResult).toMatchObject(
        {
          ok: true,
          active_loan_id: activeLoanId,
        },
      );

      const { data: duplicateSchedules, error: duplicateSchedulesError } =
        await manager
          .from("loan_repayment_schedules")
          .select("id")
          .eq("active_loan_id", activeLoanId);
      expect(duplicateSchedulesError).toBeNull();
      expect(duplicateSchedules).toHaveLength(installmentCount);
    }
  });

  it("verifying one installment reduces only that installment and pays the loan at zero balance", async () => {
    const { activeLoanId, schedules, repaymentAmount } =
      await createAcceptedLoanWithTerm(
        borrower,
        approvedLender,
        "3_months",
        23801,
      );
    const firstSchedule = schedules[0];
    const secondSchedule = schedules[1];
    const finalSchedule = schedules[2];

    const firstSubmitResult = await submitProofForSchedule(
      borrower,
      firstSchedule.id,
      activeLoanId,
    );
    expect(firstSubmitResult.ok).toBe(true);

    const firstVerifyResult = await approvedLender.rpc(
      "review_repayment_proof",
      {
        p_proof_id: firstSubmitResult.proof_id ?? "",
        p_decision: "verified",
        p_review_notes: "",
      },
    );
    expect(firstVerifyResult.error).toBeNull();
    expect(
      firstVerifyResult.data as Json as RepaymentProofResult,
    ).toMatchObject({
      ok: true,
      active_loan_id: activeLoanId,
      loan_status: "active",
    });

    const { data: loanAfterFirst, error: loanAfterFirstError } =
      await approvedLender
        .from("active_loans")
        .select("outstanding_balance, status")
        .eq("id", activeLoanId)
        .single();
    expect(loanAfterFirstError).toBeNull();
    expect(toCents(loanAfterFirst?.outstanding_balance ?? 0)).toBe(
      toCents(repaymentAmount) - toCents(firstSchedule.amount_due),
    );
    expect(loanAfterFirst).toMatchObject({ status: "active" });

    for (const schedule of [secondSchedule, finalSchedule]) {
      const submitResult = await submitProofForSchedule(
        borrower,
        schedule.id,
        activeLoanId,
      );
      expect(submitResult.ok).toBe(true);

      const verifyResult = await approvedLender.rpc("review_repayment_proof", {
        p_proof_id: submitResult.proof_id ?? "",
        p_decision: "verified",
        p_review_notes: "",
      });
      expect(verifyResult.error).toBeNull();
    }

    const { data: paidLoan, error: paidLoanError } = await approvedLender
      .from("active_loans")
      .select("outstanding_balance, status")
      .eq("id", activeLoanId)
      .single();
    expect(paidLoanError).toBeNull();
    expect(toCents(paidLoan?.outstanding_balance ?? 0)).toBe(0);
    expect(paidLoan).toMatchObject({ status: "paid" });
  });

  it("lets a borrower submit repayment proof for their own active loan repayment", async () => {
    const { activeLoanId, repaymentScheduleId } =
      await createAcceptedLoanWithSchedule(borrower, approvedLender);

    const submitResult = await submitProofForSchedule(
      borrower,
      repaymentScheduleId,
      activeLoanId,
    );

    expect(submitResult).toMatchObject({
      ok: true,
      active_loan_id: activeLoanId,
    });
    expect(submitResult.proof_id).toBeTruthy();

    const { data: schedule, error: scheduleError } = await borrower
      .from("loan_repayment_schedules")
      .select("status")
      .eq("id", repaymentScheduleId)
      .single();

    expect(scheduleError).toBeNull();
    expect(schedule).toMatchObject({ status: "submitted" });

    const { data: proof, error: proofError } = await borrower
      .from("repayment_proofs")
      .select("id, status, file_name")
      .eq("id", submitResult.proof_id ?? "")
      .single();

    expect(proofError).toBeNull();
    expect(proof).toMatchObject({
      status: "submitted",
      file_name: "proof.pdf",
    });

    const { data: auditLogs, error: auditError } = await manager
      .from("audit_logs")
      .select("action")
      .eq("action", "repayment_proof_submitted");

    expect(auditError).toBeNull();
    expect(auditLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "repayment_proof_submitted" }),
      ]),
    );
  });

  it("prevents borrowers from submitting proof for another borrower's repayment", async () => {
    const { activeLoanId, repaymentScheduleId } =
      await createAcceptedLoanWithSchedule(borrower, approvedLender);

    const blockedResult = await submitProofForSchedule(
      otherBorrower,
      repaymentScheduleId,
      activeLoanId,
      ids.otherBorrower,
    );

    expect(blockedResult.ok).toBe(false);

    const { data: proofRows, error: proofError } = await manager
      .from("repayment_proofs")
      .select("id")
      .eq("repayment_schedule_id", repaymentScheduleId);

    expect(proofError).toBeNull();
    expect(proofRows).toEqual([]);
  });

  it("enforces repayment proof metadata visibility for accepted lender, unrelated lender, and manager", async () => {
    const { activeLoanId, repaymentScheduleId } =
      await createAcceptedLoanWithSchedule(borrower, approvedLender);
    const submitResult = await submitProofForSchedule(
      borrower,
      repaymentScheduleId,
      activeLoanId,
    );

    expect(submitResult.ok).toBe(true);

    const proofSelect = "id, repayment_schedule_id, borrower_id, lender_id, status";
    const { data: lenderProofs, error: lenderProofsError } =
      await approvedLender
        .from("repayment_proofs")
        .select(proofSelect)
        .eq("id", submitResult.proof_id ?? "");

    expect(lenderProofsError).toBeNull();
    expect(lenderProofs).toHaveLength(1);

    const { data: unrelatedProofs, error: unrelatedProofsError } =
      await partnerLender
        .from("repayment_proofs")
        .select(proofSelect)
        .eq("id", submitResult.proof_id ?? "");

    expect(unrelatedProofsError).toBeNull();
    expect(unrelatedProofs).toEqual([]);

    const { data: managerProofs, error: managerProofsError } = await manager
      .from("repayment_proofs")
      .select(proofSelect)
      .eq("id", submitResult.proof_id ?? "");

    expect(managerProofsError).toBeNull();
    expect(managerProofs).toHaveLength(1);
  });

  it("lets the accepted lender verify submitted proof and updates repayment and balance atomically", async () => {
    const { activeLoanId, amountDue, repaymentScheduleId } =
      await createAcceptedLoanWithSchedule(borrower, approvedLender);
    const submitResult = await submitProofForSchedule(
      borrower,
      repaymentScheduleId,
      activeLoanId,
    );

    expect(submitResult.ok).toBe(true);
    const verifyResult = await approvedLender.rpc("review_repayment_proof", {
      p_proof_id: submitResult.proof_id ?? "",
      p_decision: "verified",
      p_review_notes: "",
    });

    expect(verifyResult.error).toBeNull();
    expect((verifyResult.data as Json as RepaymentProofResult)).toMatchObject({
      ok: true,
      active_loan_id: activeLoanId,
      loan_status: "paid",
    });

    const { data: proof, error: proofError } = await approvedLender
      .from("repayment_proofs")
      .select("status")
      .eq("id", submitResult.proof_id ?? "")
      .single();
    expect(proofError).toBeNull();
    expect(proof).toMatchObject({ status: "verified" });

    const { data: schedule, error: scheduleError } = await approvedLender
      .from("loan_repayment_schedules")
      .select("status")
      .eq("id", repaymentScheduleId)
      .single();
    expect(scheduleError).toBeNull();
    expect(schedule).toMatchObject({ status: "verified" });

    const { data: loan, error: loanError } = await approvedLender
      .from("active_loans")
      .select("outstanding_balance, status")
      .eq("id", activeLoanId)
      .single();
    expect(loanError).toBeNull();
    expect(Number(loan?.outstanding_balance)).toBe(0);
    expect(Number(loan?.outstanding_balance)).toBeGreaterThanOrEqual(0);
    expect(amountDue).toBeGreaterThan(0);
    expect(loan).toMatchObject({ status: "paid" });

    const duplicateVerifyResult = await approvedLender.rpc(
      "review_repayment_proof",
      {
        p_proof_id: submitResult.proof_id ?? "",
        p_decision: "verified",
        p_review_notes: "",
      },
    );
    expect(duplicateVerifyResult.error).toBeNull();
    expect(
      (duplicateVerifyResult.data as Json as RepaymentProofResult).ok,
    ).toBe(false);

    const { data: auditLogs, error: auditError } = await manager
      .from("audit_logs")
      .select("action")
      .in("action", [
        "repayment_proof_verified",
        "repayment_verified",
        "loan_balance_updated",
        "loan_paid",
      ]);

    expect(auditError).toBeNull();
    expect(auditLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "repayment_proof_verified" }),
        expect.objectContaining({ action: "repayment_verified" }),
        expect.objectContaining({ action: "loan_balance_updated" }),
        expect.objectContaining({ action: "loan_paid" }),
      ]),
    );
  });

  it("lets the accepted lender reject submitted proof without reducing outstanding balance", async () => {
    const { activeLoanId, repaymentScheduleId } =
      await createAcceptedLoanWithSchedule(borrower, approvedLender);
    const submitResult = await submitProofForSchedule(
      borrower,
      repaymentScheduleId,
      activeLoanId,
    );

    const { data: loanBefore, error: loanBeforeError } = await approvedLender
      .from("active_loans")
      .select("outstanding_balance")
      .eq("id", activeLoanId)
      .single();
    expect(loanBeforeError).toBeNull();

    const rejectResult = await approvedLender.rpc("review_repayment_proof", {
      p_proof_id: submitResult.proof_id ?? "",
      p_decision: "rejected",
      p_review_notes: "Receipt amount is unclear.",
    });

    expect(rejectResult.error).toBeNull();
    expect((rejectResult.data as Json as RepaymentProofResult).ok).toBe(true);

    const { data: proof, error: proofError } = await approvedLender
      .from("repayment_proofs")
      .select("status, review_notes")
      .eq("id", submitResult.proof_id ?? "")
      .single();
    expect(proofError).toBeNull();
    expect(proof).toMatchObject({
      status: "rejected",
      review_notes: "Receipt amount is unclear.",
    });

    const { data: schedule, error: scheduleError } = await approvedLender
      .from("loan_repayment_schedules")
      .select("status")
      .eq("id", repaymentScheduleId)
      .single();
    expect(scheduleError).toBeNull();
    expect(schedule).toMatchObject({ status: "rejected" });

    const { data: loanAfter, error: loanAfterError } = await approvedLender
      .from("active_loans")
      .select("outstanding_balance")
      .eq("id", activeLoanId)
      .single();
    expect(loanAfterError).toBeNull();
    expect(Number(loanAfter?.outstanding_balance)).toBe(
      Number(loanBefore?.outstanding_balance),
    );

    const { data: auditLogs, error: auditError } = await manager
      .from("audit_logs")
      .select("action")
      .eq("action", "repayment_proof_rejected");

    expect(auditError).toBeNull();
    expect(auditLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "repayment_proof_rejected" }),
      ]),
    );
  });

  it("supports repayment proof rejection, re-upload history, and final verification", async () => {
    const { activeLoanId, amountDue, repaymentScheduleId } =
      await createAcceptedLoanWithSchedule(borrower, approvedLender);

    const firstSubmitResult = await submitProofForSchedule(
      borrower,
      repaymentScheduleId,
      activeLoanId,
      ids.borrower,
      "initial",
    );
    expect(firstSubmitResult).toMatchObject({
      ok: true,
      active_loan_id: activeLoanId,
    });

    const duplicateSubmitResult = await submitProofForSchedule(
      borrower,
      repaymentScheduleId,
      activeLoanId,
      ids.borrower,
      "duplicate",
    );
    expect(duplicateSubmitResult).toMatchObject({
      ok: false,
      message: "A proof is already waiting for lender review.",
    });

    const unrelatedReview = await partnerLender.rpc("review_repayment_proof", {
      p_proof_id: firstSubmitResult.proof_id ?? "",
      p_decision: "rejected",
      p_review_notes: "Not your loan.",
    });
    expect(unrelatedReview.error).toBeNull();
    expect(unrelatedReview.data as Json as RepaymentProofResult).toMatchObject({
      ok: false,
    });

    const pendingLenderReview = await pendingLender.rpc("review_repayment_proof", {
      p_proof_id: firstSubmitResult.proof_id ?? "",
      p_decision: "rejected",
      p_review_notes: "Pending lender cannot review.",
    });
    expect(pendingLenderReview.error).toBeNull();
    expect(pendingLenderReview.data as Json as RepaymentProofResult).toMatchObject({
      ok: false,
      message: "Only approved lenders can review repayment proof.",
    });

    const { data: loanBeforeRejection, error: loanBeforeRejectionError } =
      await approvedLender
        .from("active_loans")
        .select("outstanding_balance")
        .eq("id", activeLoanId)
        .single();
    expect(loanBeforeRejectionError).toBeNull();

    const rejectResult = await approvedLender.rpc("review_repayment_proof", {
      p_proof_id: firstSubmitResult.proof_id ?? "",
      p_decision: "rejected",
      p_review_notes: "Receipt amount is unclear.",
    });
    expect(rejectResult.error).toBeNull();
    expect(rejectResult.data as Json as RepaymentProofResult).toMatchObject({
      ok: true,
      active_loan_id: activeLoanId,
    });

    const { data: loanAfterRejection, error: loanAfterRejectionError } =
      await approvedLender
        .from("active_loans")
        .select("outstanding_balance")
        .eq("id", activeLoanId)
        .single();
    expect(loanAfterRejectionError).toBeNull();
    expect(Number(loanAfterRejection?.outstanding_balance)).toBe(
      Number(loanBeforeRejection?.outstanding_balance),
    );

    const secondSubmitResult = await submitProofForSchedule(
      borrower,
      repaymentScheduleId,
      activeLoanId,
      ids.borrower,
      "corrected",
    );
    expect(secondSubmitResult).toMatchObject({
      ok: true,
      active_loan_id: activeLoanId,
    });
    expect(secondSubmitResult.proof_id).not.toBe(firstSubmitResult.proof_id);

    const { data: proofHistory, error: proofHistoryError } = await manager
      .from("repayment_proofs")
      .select("id, status, review_notes")
      .eq("repayment_schedule_id", repaymentScheduleId)
      .order("created_at", { ascending: true });

    expect(proofHistoryError).toBeNull();
    expect(proofHistory).toEqual([
      expect.objectContaining({
        id: firstSubmitResult.proof_id,
        status: "rejected",
        review_notes: "Receipt amount is unclear.",
      }),
      expect.objectContaining({
        id: secondSubmitResult.proof_id,
        status: "submitted",
        review_notes: null,
      }),
    ]);

    const verifyResult = await approvedLender.rpc("review_repayment_proof", {
      p_proof_id: secondSubmitResult.proof_id ?? "",
      p_decision: "verified",
      p_review_notes: "Payment matched.",
    });
    expect(verifyResult.error).toBeNull();
    expect(verifyResult.data as Json as RepaymentProofResult).toMatchObject({
      ok: true,
      active_loan_id: activeLoanId,
      loan_status: "paid",
    });

    const { data: loanAfterVerification, error: loanAfterVerificationError } =
      await approvedLender
        .from("active_loans")
        .select("outstanding_balance, status")
        .eq("id", activeLoanId)
        .single();
    expect(loanAfterVerificationError).toBeNull();
    expect(Number(loanAfterVerification?.outstanding_balance)).toBe(
      Number(loanBeforeRejection?.outstanding_balance) - amountDue,
    );
    expect(loanAfterVerification).toMatchObject({ status: "paid" });

    const submitAfterVerificationResult = await submitProofForSchedule(
      borrower,
      repaymentScheduleId,
      activeLoanId,
      ids.borrower,
      "after-verified",
    );
    expect(submitAfterVerificationResult).toMatchObject({
      ok: false,
      message: "This repayment is already verified.",
    });
  });

  it("projects completed workflow records into manager dashboard data loaders", async () => {
    const { applicationId, activeLoanId, schedules } =
      await createAcceptedLoanWithTerm(
        borrower,
        approvedLender,
        "3_months",
        23801,
      );

    const verifiedProof = await submitProofForSchedule(
      borrower,
      schedules[0].id,
      activeLoanId,
      ids.borrower,
      "verified",
    );
    const verifyResult = await approvedLender.rpc("review_repayment_proof", {
      p_proof_id: verifiedProof.proof_id ?? "",
      p_decision: "verified",
      p_review_notes: "Payment matched.",
    });
    expect(verifyResult.error).toBeNull();

    const rejectedProof = await submitProofForSchedule(
      borrower,
      schedules[1].id,
      activeLoanId,
      ids.borrower,
      "rejected",
    );
    const rejectResult = await approvedLender.rpc("review_repayment_proof", {
      p_proof_id: rejectedProof.proof_id ?? "",
      p_decision: "rejected",
      p_review_notes: "Receipt amount is unclear.",
    });
    expect(rejectResult.error).toBeNull();

    const submittedProof = await submitProofForSchedule(
      borrower,
      schedules[2].id,
      activeLoanId,
      ids.borrower,
      "submitted",
    );
    expect(submittedProof).toMatchObject({ ok: true });

    const managerClient = manager as Parameters<typeof loadManagerOverview>[0];

    const overview = await loadManagerOverview(managerClient);
    const metrics = new Map(
      overview.metrics.map((metric) => [metric.label, metric.value]),
    );
    expect(overview.ok).toBe(true);
    expect(metrics.get("Active loans")).toBe(1);
    expect(metrics.get("Submitted proofs")).toBe(1);
    expect(metrics.get("Rejected proofs")).toBe(1);
    expect(metrics.get("Verified repayments")).toBe(1);
    expect(metrics.get("Accepted applications")).toBe(1);

    const loans = await loadManagerLoans(managerClient, { status: "active" });
    expect(loans).toMatchObject({ ok: true });
    expect(loans.loans).toEqual([
      expect.objectContaining({
        id: activeLoanId,
        borrower: expect.objectContaining({ displayName: "Borrower One" }),
        lender: expect.objectContaining({ displayName: "Approved Lender" }),
        status: "active",
        schedule: {
          installmentCount: 3,
          verifiedCount: 1,
          submittedCount: 1,
          rejectedCount: 1,
          nextDueDate: schedules[1].due_date,
        },
      }),
    ]);

    const loansByBorrower = await loadManagerLoans(managerClient, {
      borrower: "Borrower One",
    });
    expect(loansByBorrower.loans).toEqual([
      expect.objectContaining({ id: activeLoanId }),
    ]);

    const loanDetail = await loadManagerLoanDetail(managerClient, activeLoanId);
    expect(loanDetail).toMatchObject({
      ok: true,
      mode: "loaded",
      loan: expect.objectContaining({
        id: activeLoanId,
        borrower: expect.objectContaining({ displayName: "Borrower One" }),
        lender: expect.objectContaining({ displayName: "Approved Lender" }),
        repaymentSchedules: expect.arrayContaining([
          expect.objectContaining({
            installmentNumber: 1,
            amountDue: expect.any(Number),
          }),
        ]),
        repaymentProofs: expect.arrayContaining([
          expect.objectContaining({ id: submittedProof.proof_id }),
        ]),
      }),
    });

    const invalidLoanDetail = await loadManagerLoanDetail(
      managerClient,
      "not-a-loan-id",
    );
    expect(invalidLoanDetail).toMatchObject({
      ok: false,
      mode: "invalid-id",
      loan: null,
      message: "Invalid loan ID.",
    });

    const missingLoanDetail = await loadManagerLoanDetail(
      managerClient,
      "99999999-9999-4999-9999-999999999999",
    );
    expect(missingLoanDetail).toMatchObject({
      ok: false,
      mode: "not-found",
      loan: null,
      message: "Loan not found.",
    });

    const repayments = await loadManagerRepayments(managerClient, {});
    expect(repayments).toMatchObject({ ok: true });
    expect(repayments.proofs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: verifiedProof.proof_id,
          proofStatus: "verified",
          repaymentStatus: "verified",
          installmentNumber: 1,
        }),
        expect.objectContaining({
          id: rejectedProof.proof_id,
          proofStatus: "rejected",
          repaymentStatus: "rejected",
          installmentNumber: 2,
        }),
        expect.objectContaining({
          id: submittedProof.proof_id,
          proofStatus: "submitted",
          repaymentStatus: "submitted",
          installmentNumber: 3,
        }),
      ]),
    );

    const submittedRepayments = await loadManagerRepayments(managerClient, {
      proofStatus: "submitted",
      repaymentStatus: "submitted",
    });
    expect(submittedRepayments.proofs).toEqual([
      expect.objectContaining({ id: submittedProof.proof_id }),
    ]);

    const submittedProofRow = repayments.proofs.find(
      (proof) => proof.id === submittedProof.proof_id,
    );
    expect(submittedProofRow).toBeDefined();

    const proofDetail = await loadManagerRepaymentProofDetail(
      managerClient,
      submittedProof.proof_id ?? "",
    );
    expect(proofDetail).toMatchObject({
      ok: true,
      proof: expect.objectContaining({
        id: submittedProof.proof_id,
        proofStatus: "submitted",
        repaymentStatus: "submitted",
        borrower: expect.objectContaining({ displayName: "Borrower One" }),
        lender: expect.objectContaining({ displayName: "Approved Lender" }),
      }),
    });

    const invalidProofDetail = await loadManagerRepaymentProofDetail(
      managerClient,
      "not-a-proof-id",
    );
    expect(invalidProofDetail).toMatchObject({
      ok: false,
      proof: null,
      message: "Invalid repayment proof ID.",
    });

    for (const range of ["this_week", "this_month", "this_year"]) {
      const rangeFilters = resolveSubmittedDateRangeFilters({
        range,
        now: new Date(submittedProofRow?.submittedAt ?? ""),
      });
      const filteredRepayments = await loadManagerRepayments(managerClient, {
        proofStatus: "submitted",
        repaymentStatus: "submitted",
        ...rangeFilters,
      });

      expect(filteredRepayments.proofs).toEqual([
        expect.objectContaining({ id: submittedProof.proof_id }),
      ]);
    }

    const applications = await loadManagerApplications(managerClient, {
      status: "accepted",
    });
    expect(applications).toMatchObject({ ok: true });
    expect(applications.applications).toEqual([
      expect.objectContaining({
        id: applicationId,
        borrower: expect.objectContaining({ displayName: "Borrower One" }),
        status: "accepted",
        offerCounts: expect.objectContaining({ accepted: 1 }),
        acceptedOffer: expect.objectContaining({
          lenderName: "Approved Capital",
          repaymentAmount: 23801,
        }),
      }),
    ]);

    const applicationDetail = await loadManagerApplicationDetail(
      managerClient,
      applicationId,
    );
    expect(applicationDetail).toMatchObject({
      ok: true,
      mode: "loaded",
      application: expect.objectContaining({
        id: applicationId,
        borrower: expect.objectContaining({ displayName: "Borrower One" }),
        offers: expect.arrayContaining([
          expect.objectContaining({
            status: "accepted",
            lender_name: "Approved Capital",
          }),
        ]),
        activeLoan: expect.objectContaining({ id: activeLoanId }),
      }),
    });

    const invalidApplicationDetail = await loadManagerApplicationDetail(
      managerClient,
      "not-an-application-id",
    );
    expect(invalidApplicationDetail).toMatchObject({
      ok: false,
      mode: "invalid-id",
      application: null,
      message: "Invalid application ID.",
    });

    const missingApplicationDetail = await loadManagerApplicationDetail(
      managerClient,
      "99999999-9999-4999-9999-999999999999",
    );
    expect(missingApplicationDetail).toMatchObject({
      ok: false,
      mode: "not-found",
      application: null,
      message: "Application not found.",
    });

    const auditLogs = await loadManagerAuditLogs(managerClient, {
      action: "repayment_proof",
    });
    expect(auditLogs).toMatchObject({ ok: true });
    expect(auditLogs.logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "repayment_proof_submitted",
          targetTable: "repayment_proofs",
        }),
        expect.objectContaining({
          action: "repayment_proof_verified",
          targetTable: "repayment_proofs",
        }),
        expect.objectContaining({
          action: "repayment_proof_rejected",
          targetTable: "repayment_proofs",
        }),
      ]),
    );

    const auditLogId = auditLogs.logs.find(
      (log) => log.action === "repayment_proof_submitted",
    )?.id;
    expect(auditLogId).toBeDefined();

    const auditLogDetail = await loadManagerAuditLogDetail(
      managerClient,
      auditLogId ?? "",
    );
    expect(auditLogDetail).toMatchObject({
      ok: true,
      mode: "loaded",
      log: expect.objectContaining({
        id: auditLogId,
        action: "repayment_proof_submitted",
        targetTable: "repayment_proofs",
        metadata: expect.anything(),
      }),
    });

    const invalidAuditLogDetail = await loadManagerAuditLogDetail(
      managerClient,
      "not-an-audit-log-id",
    );
    expect(invalidAuditLogDetail).toMatchObject({
      ok: false,
      mode: "invalid-id",
      log: null,
      message: "Invalid audit log ID.",
    });

    const missingAuditLogDetail = await loadManagerAuditLogDetail(
      managerClient,
      "99999999-9999-4999-9999-999999999999",
    );
    expect(missingAuditLogDetail).toMatchObject({
      ok: false,
      mode: "not-found",
      log: null,
      message: "Audit log not found.",
    });

    const lookup = await loadManagerLookup(managerClient, "Borrower One");
    expect(lookup).toMatchObject({ ok: true });
    expect(lookup.results).toEqual([
      expect.objectContaining({
        borrower: expect.objectContaining({ displayName: "Borrower One" }),
        portfolio: expect.objectContaining({ location: "Quezon City" }),
        applications: [
          expect.objectContaining({
            id: applicationId,
            activeLoan: expect.objectContaining({
              id: activeLoanId,
              schedule: expect.objectContaining({
                installmentCount: 3,
                verifiedCount: 1,
                submittedCount: 1,
                rejectedCount: 1,
              }),
            }),
          }),
        ],
      }),
    ]);

    const allUsers = await loadManagerUserDirectory(managerClient, {});
    expect(allUsers).toMatchObject({ ok: true });
    expect(new Set(allUsers.users.map((user) => user.role))).toEqual(
      new Set(["borrower", "lender", "manager"]),
    );

    const borrowers = await loadManagerUserDirectory(managerClient, {
      role: "borrower",
    });
    expect(borrowers.users.length).toBeGreaterThan(0);
    expect(borrowers.users.every((user) => user.role === "borrower")).toBe(true);
    expect(borrowers.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "borrower",
          profile: expect.objectContaining({ displayName: "Borrower One" }),
          portfolioLocation: "Quezon City",
          applicationCount: 1,
          activeLoanCount: 1,
          latestApplicationStatus: "accepted",
        }),
      ]),
    );

    const borrowerDetail = await loadManagerUserDetail(managerClient, ids.borrower);
    expect(borrowerDetail).toMatchObject({
      ok: true,
      mode: "loaded",
      user: expect.objectContaining({
        role: "borrower",
        profile: expect.objectContaining({ displayName: "Borrower One" }),
        portfolio: expect.objectContaining({ location: "Quezon City" }),
        applications: [
          expect.objectContaining({
            id: applicationId,
            activeLoan: expect.objectContaining({ id: activeLoanId }),
          }),
        ],
      }),
    });

    const invalidUserDetail = await loadManagerUserDetail(
      managerClient,
      "not-a-user-id",
    );
    expect(invalidUserDetail).toMatchObject({
      ok: false,
      mode: "invalid-id",
      user: null,
      message: "Invalid user ID.",
    });

    const missingUserDetail = await loadManagerUserDetail(
      managerClient,
      "99999999-9999-4999-9999-999999999999",
    );
    expect(missingUserDetail).toMatchObject({
      ok: false,
      mode: "not-found",
      user: null,
      message: "User not found.",
    });

    const lenders = await loadManagerUserDirectory(managerClient, {
      role: "lender",
    });
    expect(lenders.users.length).toBeGreaterThan(0);
    expect(lenders.users.every((user) => user.role === "lender")).toBe(true);
    expect(lenders.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "lender",
          profile: expect.objectContaining({ displayName: "Approved Lender" }),
          organizationName: "Approved Capital",
          verificationStatus: "approved",
          offerCount: 1,
          acceptedOfferCount: 1,
          activeLoanCount: 1,
          submittedProofCount: 1,
        }),
      ]),
    );

    const lenderDetail = await loadManagerUserDetail(
      managerClient,
      ids.approvedLender,
    );
    expect(lenderDetail).toMatchObject({
      ok: true,
      mode: "loaded",
      user: expect.objectContaining({
        role: "lender",
        profile: expect.objectContaining({ displayName: "Approved Lender" }),
        lenderProfile: expect.objectContaining({
          organization_name: "Approved Capital",
        }),
        activeLoans: [expect.objectContaining({ id: activeLoanId })],
        submittedProofs: [expect.objectContaining({ id: submittedProof.proof_id })],
      }),
    });

    const managers = await loadManagerUserDirectory(managerClient, {
      role: "manager",
    });
    expect(managers.users.length).toBeGreaterThan(0);
    expect(managers.users.every((user) => user.role === "manager")).toBe(true);
    expect(managers.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "manager",
          profile: expect.objectContaining({ displayName: "Platform Manager" }),
          status: "active",
        }),
      ]),
    );
  });
});
