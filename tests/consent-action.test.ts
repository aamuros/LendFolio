import { beforeEach, describe, expect, it, vi } from "vitest";
import { acceptUserConsentsAction } from "../app/consents/actions";
import { getCurrentUserProfile } from "@/lib/access-control";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

vi.mock("@/lib/access-control", () => ({
  getCurrentUserProfile: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

const mockedGetCurrentUserProfile = vi.mocked(getCurrentUserProfile);
const mockedRevalidatePath = vi.mocked(revalidatePath);
const mockedHeaders = vi.mocked(headers);

function mockAccess(rpc = vi.fn().mockResolvedValue({
  data: { ok: true, message: "Required disclosures accepted." },
  error: null,
})) {
  mockedGetCurrentUserProfile.mockResolvedValue({
    ok: true,
    supabase: { rpc },
    profile: {
      id: "user-1",
      role: "borrower",
      display_name: "User One",
      status: "active",
      created_at: "2026-05-26T00:00:00.000Z",
      updated_at: "2026-05-26T00:00:00.000Z",
      lenderProfile: null,
    },
  } as never);

  return rpc;
}

describe("acceptUserConsentsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedHeaders.mockResolvedValue(
      new Headers({
        "x-forwarded-for": "203.0.113.10, 10.0.0.1",
        "user-agent": "Vitest",
      }) as never,
    );
  });

  it("accepts borrower document upload consent versions", async () => {
    const rpc = mockAccess();

    const result = await acceptUserConsentsAction("borrower_document_upload");

    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith("accept_user_consents", {
      p_consents: [
        { consent_type: "terms_of_service", version: "2026-05-terms-v1" },
        { consent_type: "privacy_notice", version: "2026-05-privacy-v1" },
        {
          consent_type: "document_processing_consent",
          version: "2026-05-document-processing-v1",
        },
      ],
      p_ip_address: "203.0.113.10",
      p_user_agent: "Vitest",
    });
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/borrower");
  });

  it("accepts borrower loan application consent versions", async () => {
    const rpc = mockAccess();

    await acceptUserConsentsAction("borrower_loan_application");

    expect(rpc).toHaveBeenCalledWith(
      "accept_user_consents",
      expect.objectContaining({
        p_consents: [
          { consent_type: "terms_of_service", version: "2026-05-terms-v1" },
          { consent_type: "privacy_notice", version: "2026-05-privacy-v1" },
          {
            consent_type: "credit_review_authorization",
            version: "2026-05-credit-review-v1",
          },
        ],
      }),
    );
  });

  it("accepts lender review consent versions", async () => {
    const rpc = mockAccess();

    await acceptUserConsentsAction("lender_review");

    expect(rpc).toHaveBeenCalledWith(
      "accept_user_consents",
      expect.objectContaining({
        p_consents: [
          { consent_type: "terms_of_service", version: "2026-05-terms-v1" },
          { consent_type: "privacy_notice", version: "2026-05-privacy-v1" },
          { consent_type: "lender_review_consent", version: "2026-05-lender-review-v1" },
        ],
      }),
    );
  });

  it("returns useful message when RPC fails", async () => {
    mockAccess(
      vi.fn().mockResolvedValue({
        data: { ok: false, message: "Could not accept these disclosures." },
        error: null,
      }),
    );

    const result = await acceptUserConsentsAction("lender_review");

    expect(result).toEqual({
      ok: false,
      message: "Could not accept these disclosures.",
      missingConsents: expect.any(Array),
    });
  });
});
