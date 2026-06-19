import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitLenderVerificationDocument } from "../app/lender/actions";
import { checkVerificationDocumentWithAi } from "@/lib/ai/document-checker";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/ai/document-checker", () => ({
  checkVerificationDocumentWithAi: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockedCheckVerificationDocumentWithAi = vi.mocked(
  checkVerificationDocumentWithAi,
);
const mockedCreateSupabaseServerClient = vi.mocked(createSupabaseServerClient);
const mockedRevalidatePath = vi.mocked(revalidatePath);

type MockSupabase = {
  auth: {
    getUser: ReturnType<typeof vi.fn>;
  };
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
  storage: {
    from: ReturnType<typeof vi.fn>;
  };
};

function createFormData(
  file: File,
  documentType = "business_registration",
  lenderProfileId = "lender-profile-1",
) {
  const formData = new FormData();

  formData.set("documentType", documentType);
  formData.set("documentFile", file);
  formData.set("lenderProfileId", lenderProfileId);

  return formData;
}

function createMockSupabase({
  verificationStatus = "pending",
  rpcResult = {
    data: {
      ok: true,
      message: "Verification document uploaded.",
      document_id: "document-1",
    },
    error: null,
  },
  uploadError = null,
  profileError = null,
  noProfile = false,
}: {
  verificationStatus?: "pending" | "approved" | "rejected" | "incomplete";
  rpcResult?: { data: unknown; error: unknown };
  uploadError?: unknown;
  profileError?: unknown;
  noProfile?: boolean;
} = {}): MockSupabase {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: noProfile
      ? null
      : {
          id: "lender-profile-1",
          user_id: "lender-user-1",
          verification_status: verificationStatus,
        },
    error: profileError,
  });
  const eq2 = vi.fn(() => ({ maybeSingle }));
  const eq1 = vi.fn(() => ({ eq: eq2 }));
  const select = vi.fn(() => ({ eq: eq1 }));
  const upload = vi.fn().mockResolvedValue({ error: uploadError });
  const remove = vi.fn().mockResolvedValue({ error: null });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "lender-user-1" } },
        error: null,
      }),
    },
    from: vi.fn(() => ({ select })),
    rpc: vi.fn().mockResolvedValue(rpcResult),
    storage: {
      from: vi.fn(() => ({ upload, remove })),
    },
  };
}

function mockSupabaseClient(mockSupabase: MockSupabase) {
  mockedCreateSupabaseServerClient.mockResolvedValue(
    mockSupabase as unknown as Awaited<
      ReturnType<typeof createSupabaseServerClient>
    >,
  );
}

describe("submitLenderVerificationDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCheckVerificationDocumentWithAi.mockResolvedValue({
      isDocument: true,
      detectedType: "business_registration",
      matchesRequestedType: true,
      readability: "clear",
      riskFlags: [],
      decision: "pass",
      confidence: 0.9,
      reason: "The file appears to match the requested document type.",
      aiReviewStatus: "pass",
      aiModel: "gemini-3.1-flash-lite",
      aiReviewedAt: "2026-06-19T00:00:00.000Z",
    });
  });

  it("rejects unauthenticated users", async () => {
    const mockSupabase = createMockSupabase();
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    mockSupabaseClient(mockSupabase);

    const result = await submitLenderVerificationDocument(
      null,
      createFormData(
        new File(["pdf"], "registration.pdf", { type: "application/pdf" }),
      ),
    );

    expect(result).toEqual({
      ok: false,
      message: "Sign in to continue.",
    });
    expect(mockSupabase.storage.from).not.toHaveBeenCalled();
  });

  it("rejects invalid file types before upload", async () => {
    const mockSupabase = createMockSupabase();
    mockSupabaseClient(mockSupabase);

    const result = await submitLenderVerificationDocument(
      null,
      createFormData(
        new File(["text"], "note.txt", { type: "text/plain" }),
      ),
    );

    expect(result).toEqual({
      ok: false,
      message: "Upload a PDF, JPG, JPEG, or PNG file.",
    });
    expect(mockSupabase.storage.from).not.toHaveBeenCalled();
  });

  it("rejects files over 5 MB", async () => {
    const mockSupabase = createMockSupabase();
    mockSupabaseClient(mockSupabase);

    const largeContent = new Uint8Array(5 * 1024 * 1024 + 1);
    const result = await submitLenderVerificationDocument(
      null,
      createFormData(
        new File([largeContent], "large.pdf", { type: "application/pdf" }),
      ),
    );

    expect(result).toEqual({
      ok: false,
      message: "This file is too large. Please upload a file under 5 MB.",
    });
    expect(mockSupabase.storage.from).not.toHaveBeenCalled();
  });

  it("blocks uploads when lender profile is not found", async () => {
    const mockSupabase = createMockSupabase({ noProfile: true });
    mockSupabaseClient(mockSupabase);

    const result = await submitLenderVerificationDocument(
      null,
      createFormData(
        new File(["pdf"], "registration.pdf", { type: "application/pdf" }),
      ),
    );

    expect(result).toEqual({
      ok: false,
      message: "Lender profile is unavailable.",
    });
    expect(mockSupabase.storage.from).not.toHaveBeenCalled();
  });

  it("blocks uploads after lender verification is approved", async () => {
    const mockSupabase = createMockSupabase({ verificationStatus: "approved" });
    mockSupabaseClient(mockSupabase);

    const result = await submitLenderVerificationDocument(
      null,
      createFormData(
        new File(["pdf"], "registration.pdf", { type: "application/pdf" }),
      ),
    );

    expect(result).toEqual({
      ok: false,
      message: "This lender verification is already approved.",
    });
    expect(mockSupabase.storage.from).not.toHaveBeenCalled();
  });

  it("allows uploads when lender status is pending", async () => {
    const mockSupabase = createMockSupabase({ verificationStatus: "pending" });
    mockSupabaseClient(mockSupabase);

    const result = await submitLenderVerificationDocument(
      null,
      createFormData(
        new File(["pdf"], "registration.pdf", { type: "application/pdf" }),
      ),
    );

    expect(result).toEqual({
      ok: true,
      message:
        "The document was submitted and appears to match the selected document type. A manager will still complete the final review.",
      documentId: "document-1",
    });
    expect(mockSupabase.storage.from).toHaveBeenCalledWith(
      "lender-verification-documents",
    );
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      "submit_lender_verification_document",
      expect.objectContaining({
        p_lender_profile_id: "lender-profile-1",
        p_document_type: "business_registration",
        p_file_name: "registration.pdf",
        p_file_type: "application/pdf",
        p_ai_review_status: "pass",
        p_ai_review_confidence: 0.9,
        p_ai_detected_document_type: "business_registration",
        p_ai_review_reason:
          "The file appears to match the requested document type.",
        p_ai_risk_flags: [],
        p_ai_model: "gemini-3.1-flash-lite",
        p_ai_reviewed_at: "2026-06-19T00:00:00.000Z",
      }),
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/lender");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/manager");
  });

  it("warns without blocking when AI says the document appears mismatched", async () => {
    mockedCheckVerificationDocumentWithAi.mockResolvedValueOnce({
      isDocument: true,
      detectedType: "valid_id",
      matchesRequestedType: false,
      readability: "clear",
      riskFlags: ["wrong_type"],
      decision: "fail",
      confidence: 0.88,
      reason: "The file appears to be a different document type.",
      aiReviewStatus: "fail",
      aiModel: "gemini-3.1-flash-lite",
      aiReviewedAt: "2026-06-19T00:00:00.000Z",
    });
    const mockSupabase = createMockSupabase({ verificationStatus: "pending" });
    mockSupabaseClient(mockSupabase);

    const result = await submitLenderVerificationDocument(
      null,
      createFormData(
        new File(["pdf"], "registration.pdf", { type: "application/pdf" }),
      ),
    );

    expect(result).toEqual({
      ok: true,
      message:
        "The document was submitted, but AI flagged it as possibly mismatched. You may replace it with the correct document, or wait for manager review.",
      documentId: "document-1",
      aiReviewStatus: "fail",
    });
    expect(mockSupabase.rpc).toHaveBeenCalled();
  });

  it("uploads when AI pre-screening is unavailable", async () => {
    mockedCheckVerificationDocumentWithAi.mockResolvedValueOnce({
      isDocument: false,
      detectedType: "unknown",
      matchesRequestedType: false,
      readability: "unreadable",
      riskFlags: ["other"],
      decision: "needs_manual_review",
      confidence: 0,
      reason: "AI pre-screening could not be completed; manual review is required.",
      aiReviewStatus: "error",
      aiModel: "gemini-3.1-flash-lite",
      aiReviewedAt: "2026-06-19T00:00:00.000Z",
    });
    const mockSupabase = createMockSupabase({ verificationStatus: "pending" });
    mockSupabaseClient(mockSupabase);

    const result = await submitLenderVerificationDocument(
      null,
      createFormData(
        new File(["pdf"], "registration.pdf", { type: "application/pdf" }),
      ),
    );

    expect(result).toEqual({
      ok: true,
      message:
        "The document was submitted for manual review. AI pre-screening was unavailable.",
      documentId: "document-1",
      aiReviewStatus: "error",
    });
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      "submit_lender_verification_document",
      expect.objectContaining({
        p_ai_review_status: "error",
      }),
    );
  });

  it.each([
    "business_registration",
    "authorized_representative_id",
    "authorization_letter",
    "lending_license",
    "proof_of_address",
  ])("allows upload for required lender document type %s", async (documentType) => {
    const mockSupabase = createMockSupabase({ verificationStatus: "pending" });
    mockSupabaseClient(mockSupabase);

    const result = await submitLenderVerificationDocument(
      null,
      createFormData(
        new File(["pdf"], `${documentType}.pdf`, { type: "application/pdf" }),
        documentType,
      ),
    );

    expect(result.ok).toBe(true);
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      "submit_lender_verification_document",
      expect.objectContaining({
        p_document_type: documentType,
      }),
    );
  });

  it("allows uploads when lender status is incomplete", async () => {
    const mockSupabase = createMockSupabase({
      verificationStatus: "incomplete",
    });
    mockSupabaseClient(mockSupabase);

    const result = await submitLenderVerificationDocument(
      null,
      createFormData(
        new File(["pdf"], "id.pdf", { type: "application/pdf" }),
        "authorized_representative_id",
      ),
    );

    expect(result).toEqual({
      ok: true,
      message:
        "The document was submitted and appears to match the selected document type. A manager will still complete the final review.",
      documentId: "document-1",
    });
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      "submit_lender_verification_document",
      expect.objectContaining({
        p_document_type: "authorized_representative_id",
      }),
    );
  });

  it("allows uploads when lender status is rejected", async () => {
    const mockSupabase = createMockSupabase({ verificationStatus: "rejected" });
    mockSupabaseClient(mockSupabase);

    const result = await submitLenderVerificationDocument(
      null,
      createFormData(
        new File(["pdf"], "license.pdf", { type: "application/pdf" }),
        "lending_license",
      ),
    );

    expect(result).toEqual({
      ok: true,
      message:
        "The document was submitted and appears to match the selected document type. A manager will still complete the final review.",
      documentId: "document-1",
    });
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      "submit_lender_verification_document",
      expect.objectContaining({
        p_document_type: "lending_license",
      }),
    );
  });

  it("does not use requireApprovedLender for document upload", async () => {
    const mockSupabase = createMockSupabase({ verificationStatus: "pending" });
    mockSupabaseClient(mockSupabase);

    await submitLenderVerificationDocument(
      null,
      createFormData(
        new File(["pdf"], "registration.pdf", { type: "application/pdf" }),
      ),
    );

    expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    expect(mockSupabase.from).toHaveBeenCalledWith("lender_profiles");
  });

  it("removes uploaded storage when metadata RPC fails", async () => {
    const mockSupabase = createMockSupabase({
      rpcResult: {
        data: { ok: false, message: "Could not save verification document." },
        error: null,
      },
    });
    mockSupabaseClient(mockSupabase);

    const result = await submitLenderVerificationDocument(
      null,
      createFormData(
        new File(["pdf"], "registration.pdf", { type: "application/pdf" }),
      ),
    );
    const bucket = mockSupabase.storage.from.mock.results[1]?.value;

    expect(result).toEqual({
      ok: false,
      message: "Could not save verification document.",
    });
    expect(bucket.remove).toHaveBeenCalledWith([expect.any(String)]);
  });

  it("rejects invalid document types", async () => {
    const mockSupabase = createMockSupabase();
    mockSupabaseClient(mockSupabase);

    const result = await submitLenderVerificationDocument(
      null,
      createFormData(
        new File(["pdf"], "doc.pdf", { type: "application/pdf" }),
        "invalid_type",
      ),
    );

    expect(result).toEqual({
      ok: false,
      message: "Choose a verification document type.",
    });
    expect(mockSupabase.storage.from).not.toHaveBeenCalled();
  });
});
