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

  it("maps RPC credit_limit_exceeded to credit-limit mode", async () => {
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          ok: false,
          code: "credit_limit_exceeded",
          message: "Requested amount exceeds your available credit.",
          available_credit: 3000,
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
      mode: "credit-limit",
      message:
        "Requested amount exceeds your available credit. Maximum request: PHP 3,000.",
    });
    expect(mockSupabase.rpc).toHaveBeenCalledWith("submit_loan_application", {
      p_requested_amount: 10000,
      p_purpose: "Working capital",
      p_preferred_term: "3_months",
      p_remarks: null,
    });
  });

  it("maps RPC profile_needs_review to readiness mode", async () => {
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          ok: false,
          code: "profile_needs_review",
          message: "Update your flagged profile details before applying.",
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

    expect(result).toEqual({
      ok: false,
      mode: "readiness",
      message: "Resolve flagged profile details before applying.",
    });
  });

  it("rejects needs_review application snapshots even if an RPC returns one", async () => {
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          ok: false,
          code: "profile_needs_review",
          message: "Resolve flagged profile details before applying.",
          readiness: {
            application_ready: false,
            readiness_status: "needs_review",
            profile_readiness: {
              risk_flags: ["self_declared_income_only"],
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

    expect(result).toEqual({
      ok: false,
      mode: "readiness",
      message: "Resolve flagged profile details before applying.",
    });
  });
});
