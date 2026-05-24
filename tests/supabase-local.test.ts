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

async function createPortfolioAndApplication(client: TestClient) {
  const { data: portfolio, error: portfolioError } = await client
    .from("borrower_portfolios")
    .insert({
      borrower_id: ids.borrower,
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
      borrower_id: ids.borrower,
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
) {
  const { data, error } = await client
    .from("loan_offers")
    .insert({
      loan_application_id: applicationId,
      borrower_id: ids.borrower,
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
      .select("id, status")
      .eq("loan_application_id", applicationId);

    expect(offersError).toBeNull();
    expect(offers?.filter((offer) => offer.status === "accepted")).toHaveLength(
      1,
    );
    expect(offers?.filter((offer) => offer.status === "declined")).toHaveLength(
      1,
    );

    const { data: application, error: applicationError } = await borrower
      .from("loan_applications")
      .select("status")
      .eq("id", applicationId)
      .single();

    expect(applicationError).toBeNull();
    expect(application).toMatchObject({ status: "accepted" });

    const { data: auditLogs, error: auditError } = await manager
      .from("audit_logs")
      .select("action")
      .in("action", [
        "offer_accepted",
        "competing_offers_declined",
        "application_accepted",
      ]);

    expect(auditError).toBeNull();
    expect(auditLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "offer_accepted" }),
        expect.objectContaining({ action: "competing_offers_declined" }),
        expect.objectContaining({ action: "application_accepted" }),
      ]),
    );
  });
});
