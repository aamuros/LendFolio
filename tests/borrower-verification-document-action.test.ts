import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitBorrowerVerificationDocument } from "../app/borrower/actions";
import { requireBorrower } from "@/lib/access-control";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

  it("uploads valid pending documents and saves metadata through RPC", async () => {
    const mockSupabase = createMockSupabase();
    mockBorrowerAccess(mockSupabase);

    const result = await submitBorrowerVerificationDocument(
      null,
      createFormData(new File(["pdf"], "Valid ID.pdf", { type: "application/pdf" })),
    );

    expect(result).toEqual({
      ok: true,
      message: "Verification document uploaded.",
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
        p_file_name: "Valid ID.pdf",
        p_file_type: "application/pdf",
      }),
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/borrower");
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
