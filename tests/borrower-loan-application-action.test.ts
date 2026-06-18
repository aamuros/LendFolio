import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitLoanApplication } from "../app/borrower/actions";
import { requireBorrower } from "@/lib/access-control";
import { createSupabaseServerClient } from "@/lib/supabase/server";

vi.mock("@/lib/access-control", () => ({
  requireBorrower: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockedRequireBorrower = vi.mocked(requireBorrower);
const mockedCreateSupabaseServerClient = vi.mocked(createSupabaseServerClient);

describe("submitLoanApplication consent mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps RPC consent_required to consent-required mode", async () => {
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          ok: false,
          code: "consent_required",
          message:
            "Accept the required disclosures before submitting a loan application.",
        },
        error: null,
      }),
    };

    mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase as never);
    mockedRequireBorrower.mockResolvedValue({
      ok: true,
      supabase: mockSupabase as never,
      profile: {
        id: "borrower-1",
        role: "borrower",
        additional_roles: [],
        display_name: "Borrower One",
        status: "active",
        created_at: "2026-05-26T00:00:00.000Z",
        updated_at: "2026-05-26T00:00:00.000Z",
        lenderProfile: null,
      },
    });

    const result = await submitLoanApplication({
      requestedAmount: 10000,
      purpose: "Working capital",
      preferredTerm: "3_months",
      remarks: "",
    });

    expect(result).toEqual({
      ok: false,
      mode: "consent-required",
      message:
        "Accept the required disclosures before submitting a loan application.",
    });
    expect(mockSupabase.rpc).toHaveBeenCalledWith("submit_loan_application", {
      p_requested_amount: 10000,
      p_purpose: "Working capital",
      p_preferred_term: "3_months",
      p_remarks: "",
    });
  });

  it("maps RPC active_application to a clear borrower message", async () => {
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          ok: false,
          code: "active_application",
          message: "active application",
        },
        error: null,
      }),
    };

    mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase as never);
    mockedRequireBorrower.mockResolvedValue({
      ok: true,
      supabase: mockSupabase as never,
      profile: {
        id: "borrower-1",
        role: "borrower",
        additional_roles: [],
        display_name: "Borrower One",
        status: "active",
        created_at: "2026-05-26T00:00:00.000Z",
        updated_at: "2026-05-26T00:00:00.000Z",
        lenderProfile: null,
      },
    });

    const result = await submitLoanApplication({
      requestedAmount: 10000,
      purpose: "Working capital",
      preferredTerm: "3_months",
      remarks: undefined,
    });

    expect(result).toEqual({
      ok: false,
      mode: "active-application",
      message:
        "You already have an open application. Withdraw it before submitting a new one.",
    });
    expect(mockSupabase.rpc).toHaveBeenCalledWith("submit_loan_application", {
      p_requested_amount: 10000,
      p_purpose: "Working capital",
      p_preferred_term: "3_months",
      p_remarks: null,
    });
  });

  it("accepts successful needs_review application snapshots", async () => {
    const application = {
      id: "application-1",
      borrower_id: "borrower-1",
      borrower_portfolio_id: "portfolio-1",
      requested_amount: 7000,
      purpose: "Working capital",
      preferred_term: "3_months",
      remarks: null,
      status: "submitted",
      submitted_at: "2026-06-18T00:00:00.000Z",
      created_at: "2026-06-18T00:00:00.000Z",
      updated_at: "2026-06-18T00:00:00.000Z",
      credit_limit_at_submission: 10000,
      used_credit_at_submission: 0,
      available_credit_at_submission: 10000,
      monthly_net_cash_flow_at_submission: 5000,
      credit_readiness_status: "needs_review",
      borrower_profile_snapshot: {},
      borrower_readiness_snapshot: {
        application_ready: true,
        readiness_status: "needs_review",
        profile_readiness: {
          risk_flags: ["self_declared_income_only"],
        },
      },
    };
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          ok: true,
          message: "Application submitted.",
          application,
        },
        error: null,
      }),
    };

    mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase as never);
    mockedRequireBorrower.mockResolvedValue({
      ok: true,
      supabase: mockSupabase as never,
      profile: {
        id: "borrower-1",
        role: "borrower",
        additional_roles: [],
        display_name: "Borrower One",
        status: "active",
        created_at: "2026-05-26T00:00:00.000Z",
        updated_at: "2026-05-26T00:00:00.000Z",
        lenderProfile: null,
      },
    });

    const result = await submitLoanApplication({
      requestedAmount: 7000,
      purpose: "Working capital",
      preferredTerm: "3_months",
      remarks: "",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.application.creditReadinessStatus).toBe("needs_review");
      expect(result.application.requestedAmount).toBe(7000);
    }
  });
});
