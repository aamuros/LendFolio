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
        display_name: "Borrower One",
        status: "active",
        created_at: "2026-05-26T00:00:00.000Z",
        updated_at: "2026-05-26T00:00:00.000Z",
        lenderProfile: null,
      },
    });

    const result = await submitLoanApplication({
      requestedAmount: 10000,
      purpose: "Additional working capital for inventory.",
      preferredTerm: "3_months",
      remarks: "",
    });

    expect(result).toEqual({
      ok: false,
      mode: "consent-required",
      message:
        "Accept the required disclosures before submitting a loan application.",
    });
  });

  it("maps profile_incomplete to readiness and preserves readiness details", async () => {
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          ok: false,
          code: "profile_incomplete",
          codes: ["profile_incomplete"],
          message: "Complete your business profile before submitting an application.",
          readiness: {
            readiness_status: "incomplete",
            codes: ["profile_incomplete"],
            profile_readiness: {
              readiness_status: "incomplete",
              missing_fields: ["Business name", "Loan-use context"],
              risk_flags: ["stale_profile"],
              monthly_net_cash_flow: 18000,
              debt_burden_ratio: 0.12,
              profile_is_stale: false,
              next_actions: ["Complete the missing business profile fields."],
            },
          },
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
        display_name: "Borrower One",
        status: "active",
        created_at: "2026-05-26T00:00:00.000Z",
        updated_at: "2026-05-26T00:00:00.000Z",
        lenderProfile: null,
      },
    });

    const result = await submitLoanApplication({
      requestedAmount: 10000,
      purpose: "Additional working capital for inventory.",
      preferredTerm: "3_months",
      remarks: "",
    });

    if (result.ok) {
      throw new Error("Expected profile_incomplete submission to fail.");
    }

    expect(result.mode).toBe("readiness");
    expect(result.message).toBe(
      "Complete your business profile before submitting an application.",
    );
    expect(result.readiness).toMatchObject({
      readinessStatus: "incomplete",
      codes: ["profile_incomplete"],
      missingFields: ["Business name", "Loan-use context"],
      riskFlags: ["stale_profile"],
      monthlyNetCashFlow: 18000,
      debtBurdenRatio: 0.12,
      profileIsStale: false,
      nextActions: ["Complete the missing business profile fields."],
      profileReadiness: {
        readinessStatus: "incomplete",
        missingFields: ["Business name", "Loan-use context"],
        riskFlags: ["stale_profile"],
        monthlyNetCashFlow: 18000,
        debtBurdenRatio: 0.12,
        profileIsStale: false,
        nextActions: ["Complete the missing business profile fields."],
      },
    });
  });
});
