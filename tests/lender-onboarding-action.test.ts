import { beforeEach, describe, expect, it, vi } from "vitest";
import { lenderOnboardingAction } from "../app/lender/onboarding/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(
    new Headers({
      "x-forwarded-for": "203.0.113.10",
      "user-agent": "Vitest",
    }),
  ),
}));

const mockedCreateSupabaseServerClient = vi.mocked(createSupabaseServerClient);

const previousState = { message: "", status: "idle" as const };

function createValidOnboardingFormData() {
  const formData = new FormData();
  formData.set("organizationName", "Lending Corp");
  formData.set("contactPerson", "Juan dela Cruz");
  formData.set("phoneNumber", "+63 900 000 0000");
  formData.set("businessAddress", "123 Main Street, Quezon City");
  formData.set("operatingArea", "Metro Manila");
  formData.set("businessRegistrationNumber", "SEC-12345");
  formData.set("minLoanAmount", "5000");
  formData.set("maxLoanAmount", "50000");
  formData.set("typicalRepaymentTerms", "1 to 6 months");
  formData.set(
    "lenderDescription",
    "We provide micro-business lending solutions for Filipino entrepreneurs in Metro Manila.",
  );
  formData.set("lenderReviewConsentAccepted", "on");
  return formData;
}

describe("lenderOnboardingAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires lenderReviewConsentAccepted checkbox", async () => {
    const formData = createValidOnboardingFormData();
    formData.delete("lenderReviewConsentAccepted");

    const result = await lenderOnboardingAction(previousState, formData);

    expect(result.status).toBe("error");
    expect(result.fieldErrors?.lenderReviewConsentAccepted).toBeDefined();
  });

  it("records lender_review consent before profile submission", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: { ok: true, message: "Required disclosures accepted." },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { ok: true, message: "Profile submitted." },
        error: null,
      });

    mockedCreateSupabaseServerClient.mockResolvedValue({
      rpc,
    } as never);

    const formData = createValidOnboardingFormData();

    try {
      await lenderOnboardingAction(previousState, formData);
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toBe("REDIRECT:/lender");
    }

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenNthCalledWith(1, "accept_user_consents", {
      p_consents: [
        { consent_type: "terms_of_service", version: "2026-05-terms-v1" },
        { consent_type: "privacy_notice", version: "2026-05-privacy-v1" },
        { consent_type: "lender_review_consent", version: "2026-05-lender-review-v1" },
      ],
      p_ip_address: "203.0.113.10",
      p_user_agent: "Vitest",
    });
    expect(rpc).toHaveBeenNthCalledWith(2, "submit_lender_onboarding", expect.any(Object));
  });

  it("redirects to /lender after successful submission", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: { ok: true, message: "Required disclosures accepted." },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { ok: true, message: "Profile submitted." },
        error: null,
      });

    mockedCreateSupabaseServerClient.mockResolvedValue({
      rpc,
    } as never);

    const formData = createValidOnboardingFormData();

    try {
      await lenderOnboardingAction(previousState, formData);
      expect.fail("Expected redirect");
    } catch (error) {
      expect((error as Error).message).toBe("REDIRECT:/lender");
    }
  });

  it("returns error when consent recording fails before profile submission", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: { message: "consent failed" },
      });

    mockedCreateSupabaseServerClient.mockResolvedValue({
      rpc,
    } as never);

    const formData = createValidOnboardingFormData();

    const result = await lenderOnboardingAction(previousState, formData);

    expect(result.status).toBe("error");
    expect(result.message).toContain("disclosure acceptance");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("accept_user_consents", expect.any(Object));
  });
});
