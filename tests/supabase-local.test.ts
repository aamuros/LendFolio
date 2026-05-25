import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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
type RepaymentProofResult = {
  ok: boolean;
  message?: string;
  proof_id?: string;
  active_loan_id?: string;
  outstanding_balance?: number;
  loan_status?: string;
};

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
}

async function createPortfolioAndApplication(
  client: TestClient,
  borrowerId: string = ids.borrower,
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
      preferred_term: "3_months",
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
  lenderId: string,
  applicationId: string,
  lenderName: string,
  approvedAmount = 22000,
  borrowerId: string = ids.borrower,
) {
  const { data, error } = await client
    .from("loan_offers")
    .insert({
      loan_application_id: applicationId,
      borrower_id: borrowerId,
      lender_id: lenderId,
      lender_name: lenderName,
      approved_amount: approvedAmount,
      repayment_amount: approvedAmount + 1800,
      fees: 500,
      due_date: "2026-08-24",
      remarks: "Offer based on submitted business profile.",
    })
    .select("id, status")
    .single<InsertedRow>();

  return { data, error };
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
  const { applicationId } = await createPortfolioAndApplication(borrowerClient);
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
    expect(blockedOffer.error?.message).toContain(
      "row-level security policy",
    );

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
        "id, loan_application_id, accepted_offer_id, borrower_id, lender_id, principal_amount, repayment_amount, outstanding_balance, status, due_date",
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
      status: "active",
      due_date: "2026-08-24",
    });
    expect(Number(activeLoans?.[0].repayment_amount)).toBe(
      Number(activeLoans?.[0].outstanding_balance),
    );

    const activeLoanId = activeLoans?.[0].id;
    expect(activeLoanId).toBe(successfulAcceptance?.active_loan_id);

    const { data: schedule, error: scheduleError } = await borrower
      .from("loan_repayment_schedules")
      .select(
        "active_loan_id, borrower_id, lender_id, installment_number, amount_due, due_date, status",
      )
      .eq("active_loan_id", activeLoanId ?? "");

    expect(scheduleError).toBeNull();
    expect(schedule).toEqual([
      expect.objectContaining({
        active_loan_id: activeLoanId,
        borrower_id: ids.borrower,
        lender_id: acceptedOffer?.lender_id,
        installment_number: 1,
        amount_due: activeLoans?.[0].repayment_amount,
        due_date: "2026-08-24",
        status: "due",
      }),
    ]);

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
    expect(duplicateScheduleCheck).toHaveLength(1);

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
    expect(blockedOfferAfterAcceptance.error?.message).toContain(
      "row-level security policy",
    );

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
    expect(blockedOffer.error?.message).toContain(
      "row-level security policy",
    );
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
  });

  it("blocks unrelated lenders from closed application and active loan context", async () => {
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

    const { data: application, error: applicationError } = await partnerLender
      .from("loan_applications")
      .select("id")
      .eq("id", applicationId);

    expect(applicationError).toBeNull();
    expect(application).toEqual([]);

    const { data: activeLoan, error: activeLoanError } = await partnerLender
      .from("active_loans")
      .select("id")
      .eq("id", activeLoanId);

    expect(activeLoanError).toBeNull();
    expect(activeLoan).toEqual([]);
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
    expect(secondOffer.error?.code).toBe("23505");

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
    expect(borrowerSchedule).toHaveLength(1);

    const { data: lenderSchedule, error: lenderScheduleError } =
      await approvedLender
        .from("loan_repayment_schedules")
        .select(scheduleSelect)
        .eq("active_loan_id", activeLoanId);
    expect(lenderScheduleError).toBeNull();
    expect(lenderSchedule).toHaveLength(1);

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
    expect(managerSchedule).toHaveLength(1);
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
});
