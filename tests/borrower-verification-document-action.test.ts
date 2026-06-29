import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitBorrowerVerificationDocument } from "../app/borrower/actions";
import { requireBorrower } from "@/lib/access-control";
import { checkVerificationDocumentWithAi } from "@/lib/ai/document-checker";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/access-control", () => ({
  requireBorrower: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/ai/document-checker", () => ({
  checkVerificationDocumentWithAi: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockedRequireBorrower = vi.mocked(requireBorrower);
const mockedCheckVerificationDocumentWithAi = vi.mocked(
  checkVerificationDocumentWithAi,
);
const mockedCreateSupabaseServerClient = vi.mocked(createSupabaseServerClient);
const mockedRevalidatePath = vi.mocked(revalidatePath);

type MockSupabase = {
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
  storage: {
    from: ReturnType<typeof vi.fn>;
  };
};

function createFormData(file: File, documentType = "valid_id") {
  const formData = new FormData();

  formData.set("documentType", documentType);
  if (documentType === "valid_id") {
    formData.set("validIdType", "passport");
  }
  formData.set("documentFile", file);

  return formData;
}

function createMockSupabase({
  verificationStatus = "pending",
  hasDocumentConsent = true,
  rpcResult = {
    data: {
      ok: true,
      message: "Verification document uploaded.",
      document_id: "document-1",
    },
    error: null,
  },
  uploadError = null,
}: {
  verificationStatus?: "pending" | "approved" | "rejected";
  hasDocumentConsent?: boolean;
  rpcResult?: { data: unknown; error: unknown };
  uploadError?: unknown;
} = {}): MockSupabase {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: {
      id: "verification-1",
      borrower_id: "borrower-1",
      verification_status: verificationStatus,
    },
    error: null,
  });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const consentRows = hasDocumentConsent
    ? [
        {
          consent_type: "terms_of_service",
          version: "2026-05-terms-v1",
          accepted_at: "2026-05-26T00:00:00.000Z",
        },
        {
          consent_type: "privacy_notice",
          version: "2026-05-privacy-v1",
          accepted_at: "2026-05-26T00:00:00.000Z",
        },
        {
          consent_type: "document_processing_consent",
          version: "2026-05-document-processing-v1",
          accepted_at: "2026-05-26T00:00:00.000Z",
        },
      ]
    : [];
  const consentOrder = vi.fn().mockResolvedValue({
    data: consentRows,
    error: null,
  });
  const consentEq = vi.fn(() => ({ order: consentOrder }));
  const consentSelect = vi.fn(() => ({ eq: consentEq }));
  const upload = vi.fn().mockResolvedValue({ error: uploadError });
  const remove = vi.fn().mockResolvedValue({ error: null });

  return {
    from: vi.fn((table: string) =>
      table === "user_consents" ? { select: consentSelect } : { select },
    ),
    rpc: vi.fn().mockResolvedValue(rpcResult),
    storage: {
      from: vi.fn(() => ({ upload, remove })),
    },
  };
}

function mockBorrowerAccess(mockSupabase: MockSupabase) {
  mockedCreateSupabaseServerClient.mockResolvedValue(
    mockSupabase as unknown as Awaited<
      ReturnType<typeof createSupabaseServerClient>
    >,
  );
  mockedRequireBorrower.mockResolvedValue({
    ok: true,
    supabase: mockSupabase as unknown as Awaited<
      ReturnType<typeof createSupabaseServerClient>
    >,
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
}

describe("submitBorrowerVerificationDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCheckVerificationDocumentWithAi.mockResolvedValue({
      isDocument: true,
      detectedType: "valid_id",
      matchesRequestedType: true,
      readability: "clear",
      riskFlags: [],
      decision: "pass",
      confidence: 0.92,
      reason: "The file appears to match the requested document type.",
      aiReviewStatus: "pass",
      aiModel: "gemini-3.1-flash-lite",
      aiReviewedAt: "2026-06-19T00:00:00.000Z",
    });
  });

  it("rejects invalid file types before upload", async () => {
    const mockSupabase = createMockSupabase();
    mockBorrowerAccess(mockSupabase);

    const result = await submitBorrowerVerificationDocument(
      null,
      createFormData(new File(["text"], "note.txt", { type: "text/plain" })),
    );

    expect(result).toEqual({
      ok: false,
      message: "Upload a JPG, PNG, WebP, or PDF file.",
    });
    expect(mockSupabase.storage.from).not.toHaveBeenCalled();
  });

  it("requires document-processing consent before upload", async () => {
    const mockSupabase = createMockSupabase({ hasDocumentConsent: false });
    mockBorrowerAccess(mockSupabase);

    const result = await submitBorrowerVerificationDocument(
      null,
      createFormData(new File(["pdf"], "id.pdf", { type: "application/pdf" })),
    );

    expect(result).toEqual({
      ok: false,
      code: "consent_required",
      message:
        "Accept the required disclosures before uploading verification documents.",
    });
    expect(mockSupabase.storage.from).not.toHaveBeenCalled();
  });

  it("blocks uploads after borrower verification is approved", async () => {
    const mockSupabase = createMockSupabase({ verificationStatus: "approved" });
    mockBorrowerAccess(mockSupabase);

    const result = await submitBorrowerVerificationDocument(
      null,
      createFormData(new File(["pdf"], "id.pdf", { type: "application/pdf" })),
    );

    expect(result).toEqual({
      ok: false,
      message: "This borrower verification is already approved.",
    });
    expect(mockSupabase.storage.from).not.toHaveBeenCalled();
  });

  it("requires a valid ID type for valid ID uploads", async () => {
    const mockSupabase = createMockSupabase();
    mockBorrowerAccess(mockSupabase);
    const formData = createFormData(
      new File(["pdf"], "id.pdf", { type: "application/pdf" }),
    );
    formData.delete("validIdType");

    const result = await submitBorrowerVerificationDocument(null, formData);

    expect(result).toEqual({
      ok: false,
      message: "Choose the valid ID type.",
    });
    expect(mockSupabase.storage.from).not.toHaveBeenCalled();
  });

  it("uploads valid pending documents and saves metadata through RPC", async () => {
    const mockSupabase = createMockSupabase();
    mockBorrowerAccess(mockSupabase);

    const result = await submitBorrowerVerificationDocument(
      null,
      createFormData(new File(["pdf"], "Valid ID.pdf", { type: "application/pdf" })),
    );

    expect(result).toEqual({
      ok: true,
      message:
        "The document was accepted by AI review. If all required documents are accepted, your borrower verification will be approved automatically.",
      documentId: "document-1",
    });
    expect(mockSupabase.storage.from).toHaveBeenCalledWith(
      "borrower-verification-documents",
    );
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      "submit_borrower_verification_document",
      expect.objectContaining({
        p_borrower_verification_id: "verification-1",
        p_document_type: "valid_id",
        p_valid_id_type: "passport",
        p_file_name: "Valid ID.pdf",
        p_file_type: "application/pdf",
        p_ai_review_status: "pass",
        p_ai_review_confidence: 0.92,
        p_ai_detected_document_type: "valid_id",
        p_ai_review_reason:
          "The file appears to match the requested document type.",
        p_ai_risk_flags: [],
        p_ai_model: "gemini-3.1-flash-lite",
        p_ai_reviewed_at: "2026-06-19T00:00:00.000Z",
      }),
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/borrower");
  });

  it("surfaces automatic borrower verification approval after required AI-passed documents are accepted", async () => {
    const mockSupabase = createMockSupabase({
      rpcResult: {
        data: {
          ok: true,
          message: "Borrower verification approved.",
          document_id: "document-1",
          document_status: "accepted",
          verification_status: "approved",
        },
        error: null,
      },
    });
    mockBorrowerAccess(mockSupabase);

    const result = await submitBorrowerVerificationDocument(
      null,
      createFormData(
        new File(["pdf"], "Business proof.pdf", { type: "application/pdf" }),
        "business_proof",
      ),
    );

    expect(result).toEqual({
      ok: true,
      message: "Borrower verification approved.",
      documentId: "document-1",
      verificationStatus: "approved",
    });
  });

  it("asks for a clearer upload when AI cannot confidently accept the document", async () => {
    mockedCheckVerificationDocumentWithAi.mockResolvedValueOnce({
      isDocument: true,
      detectedType: "unknown",
      matchesRequestedType: false,
      readability: "partially_readable",
      riskFlags: ["blurry"],
      decision: "needs_manual_review",
      confidence: 0.45,
      reason: "The document is blurry.",
      aiReviewStatus: "needs_manual_review",
      aiModel: "gemini-3.1-flash-lite",
      aiReviewedAt: "2026-06-19T00:00:00.000Z",
    });
    const mockSupabase = createMockSupabase();
    mockBorrowerAccess(mockSupabase);

    const result = await submitBorrowerVerificationDocument(
      null,
      createFormData(new File(["pdf"], "id.pdf", { type: "application/pdf" })),
    );

    expect(result).toEqual({
      ok: true,
      message:
        "This upload was not accepted. Upload a clearer document to continue verification.",
      documentId: "document-1",
      aiReviewStatus: "needs_manual_review",
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
    const mockSupabase = createMockSupabase();
    mockBorrowerAccess(mockSupabase);

    const result = await submitBorrowerVerificationDocument(
      null,
      createFormData(new File(["pdf"], "id.pdf", { type: "application/pdf" })),
    );

    expect(result).toEqual({
      ok: true,
      message:
        "This upload could not be checked automatically. Upload a clearer document to continue verification.",
      documentId: "document-1",
      aiReviewStatus: "error",
    });
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      "submit_borrower_verification_document",
      expect.objectContaining({
        p_ai_review_status: "error",
      }),
    );
  });

  it("removes uploaded storage when metadata RPC fails", async () => {
    const mockSupabase = createMockSupabase({
      rpcResult: {
        data: { ok: false, message: "Could not save verification document." },
        error: null,
      },
    });
    mockBorrowerAccess(mockSupabase);

    const result = await submitBorrowerVerificationDocument(
      null,
      createFormData(new File(["pdf"], "id.pdf", { type: "application/pdf" })),
    );
    const bucket = mockSupabase.storage.from.mock.results[1]?.value;

    expect(result).toEqual({
      ok: false,
      message: "Could not save verification document.",
    });
    expect(bucket.remove).toHaveBeenCalledWith([expect.any(String)]);
  });
});
