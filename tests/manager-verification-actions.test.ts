import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  reviewBorrowerVerificationAction,
  reviewLenderAction,
} from "@/app/manager/actions";
import { requireManager } from "@/lib/access-control";

vi.mock("@/lib/access-control", () => ({
  requireManager: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  RedirectType: { replace: "replace" },
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

const mockedRequireManager = vi.mocked(requireManager);
type ManagerAccess = Extract<
  Awaited<ReturnType<typeof requireManager>>,
  { ok: true }
>;

function createManagerSupabase(
  documents: { document_type: string; status: string }[],
) {
  const order = vi.fn().mockResolvedValue({ data: documents, error: null });
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));

  return {
    from: vi.fn(() => ({ select })),
    rpc: vi.fn().mockResolvedValue({ data: { ok: true }, error: null }),
  };
}

function mockManagerAccess(supabase: ReturnType<typeof createManagerSupabase>) {
  mockedRequireManager.mockResolvedValue({
    ok: true,
    supabase: supabase as unknown as ManagerAccess["supabase"],
    profile: {
      id: "manager-1",
      role: "manager",
      additional_roles: [],
      display_name: "Manager One",
      status: "active",
      created_at: "2026-06-19T00:00:00.000Z",
      updated_at: "2026-06-19T00:00:00.000Z",
      lenderProfile: null,
    },
  });
}

describe("manager verification approval actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks borrower approval until required documents are manually accepted", async () => {
    const supabase = createManagerSupabase([
      { document_type: "valid_id", status: "submitted" },
      { document_type: "business_proof", status: "submitted" },
    ]);
    mockManagerAccess(supabase);
    const formData = new FormData();
    formData.set("borrowerId", "borrower-1");
    formData.set("decision", "approve");

    await expect(reviewBorrowerVerificationAction(formData)).rejects.toThrow(
      "redirect:/manager/borrower-verifications?review=documents-required",
    );

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("allows borrower approval checks to reach the existing RPC when documents are accepted", async () => {
    const supabase = createManagerSupabase([
      { document_type: "valid_id", status: "accepted" },
      { document_type: "business_proof", status: "accepted" },
    ]);
    mockManagerAccess(supabase);
    const formData = new FormData();
    formData.set("borrowerId", "borrower-1");
    formData.set("decision", "approve");

    await expect(reviewBorrowerVerificationAction(formData)).rejects.toThrow(
      "redirect:/manager/borrower-verifications?review=approved",
    );

    expect(supabase.rpc).toHaveBeenCalledWith(
      "review_borrower_verification",
      expect.objectContaining({
        p_borrower_id: "borrower-1",
        p_decision: "approve",
      }),
    );
  });

  it("blocks lender approval until required documents are manually accepted", async () => {
    const supabase = createManagerSupabase([
      { document_type: "business_registration", status: "submitted" },
      { document_type: "authorized_representative_id", status: "submitted" },
      { document_type: "authorization_letter", status: "submitted" },
      { document_type: "lending_license", status: "submitted" },
      { document_type: "proof_of_address", status: "submitted" },
    ]);
    mockManagerAccess(supabase);
    const formData = new FormData();
    formData.set("lenderProfileId", "lender-profile-1");
    formData.set("decision", "approve");

    await expect(reviewLenderAction(formData)).rejects.toThrow(
      "redirect:/manager/lenders?review=documents-required",
    );

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("allows lender approval checks to reach the existing RPC when required documents are accepted", async () => {
    const supabase = createManagerSupabase([
      { document_type: "business_registration", status: "accepted" },
      { document_type: "authorized_representative_id", status: "accepted" },
      { document_type: "authorization_letter", status: "accepted" },
      { document_type: "lending_license", status: "accepted" },
      { document_type: "proof_of_address", status: "accepted" },
    ]);
    mockManagerAccess(supabase);
    const formData = new FormData();
    formData.set("lenderProfileId", "lender-profile-1");
    formData.set("decision", "approve");

    await expect(reviewLenderAction(formData)).rejects.toThrow(
      "redirect:/manager/lenders?review=approved",
    );

    expect(supabase.rpc).toHaveBeenCalledWith(
      "review_lender_verification",
      expect.objectContaining({
        p_lender_profile_id: "lender-profile-1",
        p_decision: "approve",
      }),
    );
  });
});
