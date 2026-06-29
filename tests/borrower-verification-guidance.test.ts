import { describe, expect, it } from "vitest";
import {
  borrowerVerificationDocumentTypeDescriptions,
  borrowerVerificationDocumentTypeLabels,
  borrowerVerificationDocumentTypes,
  calculateBorrowerVerificationDocumentPolicy,
  canSubmitLoanApplicationForVerification,
  getBorrowerVerificationMessage,
  requiredBorrowerVerificationDocumentTypes,
  type BorrowerVerificationDocumentSummary,
  type BorrowerVerificationSummary,
} from "@/lib/borrower-verification";

function createVerification(
  overrides: Partial<BorrowerVerificationSummary> = {},
): BorrowerVerificationSummary {
  return {
    id: "verification-1",
    status: "pending",
    managerReviewNotes: null,
    rejectionReason: null,
    submittedAt: null,
    reviewedAt: null,
    documents: [],
    documentPolicy: calculateBorrowerVerificationDocumentPolicy([]),
    ...overrides,
  };
}

function createDocument(
  overrides: Partial<BorrowerVerificationDocumentSummary> = {},
): BorrowerVerificationDocumentSummary {
  return {
    id: "doc-1",
    borrowerVerificationId: "verification-1",
    documentType: "valid_id",
    status: "submitted",
    fileName: "id.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
    uploadedAt: "2026-05-26T00:00:00.000Z",
    reviewedAt: null,
    reviewNotes: null,
    viewUrl: null,
    ...overrides,
  };
}

describe("borrower verification guidance", () => {
  it("defines valid_id and business_proof as required document types", () => {
    expect(requiredBorrowerVerificationDocumentTypes).toEqual([
      "valid_id",
      "business_proof",
    ]);
  });

  it("provides descriptions for all document types", () => {
    for (const documentType of borrowerVerificationDocumentTypes) {
      expect(borrowerVerificationDocumentTypeDescriptions[documentType]).toBeTruthy();
      expect(borrowerVerificationDocumentTypeLabels[documentType]).toBeTruthy();
    }
  });

  it("includes required document type descriptions with examples", () => {
    expect(
      borrowerVerificationDocumentTypeDescriptions.valid_id,
    ).toContain("Government-issued ID");
    expect(
      borrowerVerificationDocumentTypeDescriptions.business_proof,
    ).toContain("Barangay business permit");
  });
});

describe("verification document policy", () => {
  it("marks both required documents as missing when none uploaded", () => {
    const policy = calculateBorrowerVerificationDocumentPolicy([]);

    expect(policy.requiredDocumentTypes).toEqual(["valid_id", "business_proof"]);
    expect(policy.missingRequiredDocumentTypes).toEqual([
      "valid_id",
      "business_proof",
    ]);
    expect(policy.readyForManagerReview).toBe(false);
    expect(policy.documentsAccepted).toBe(false);
  });

  it("marks both required types as submitted before acceptance", () => {
    const documents = [
      createDocument({ documentType: "valid_id", status: "submitted" }),
      createDocument({ documentType: "business_proof", status: "submitted" }),
    ];
    const policy = calculateBorrowerVerificationDocumentPolicy(documents);

    expect(policy.readyForManagerReview).toBe(true);
    expect(policy.documentsAccepted).toBe(false);
    expect(policy.missingRequiredDocumentTypes).toEqual([
      "valid_id",
      "business_proof",
    ]);
  });

  it("marks documents accepted when both required types are accepted", () => {
    const documents = [
      createDocument({ documentType: "valid_id", status: "accepted" }),
      createDocument({ documentType: "business_proof", status: "accepted" }),
    ];
    const policy = calculateBorrowerVerificationDocumentPolicy(documents);

    expect(policy.documentsAccepted).toBe(true);
    expect(policy.readyForManagerReview).toBe(true);
    expect(policy.missingRequiredDocumentTypes).toEqual([]);
  });

  it("does not count old accepted documents while replacement is required", () => {
    const documents = [
      createDocument({ documentType: "valid_id", status: "accepted" }),
      createDocument({ documentType: "business_proof", status: "accepted" }),
    ];
    const policy = calculateBorrowerVerificationDocumentPolicy(
      documents,
      "needs_resubmission",
    );

    expect(policy.acceptedDocumentTypes).toEqual([]);
    expect(policy.submittedDocumentTypes).toEqual([]);
    expect(policy.missingRequiredDocumentTypes).toEqual([
      "valid_id",
      "business_proof",
    ]);
    expect(policy.readyForManagerReview).toBe(false);
    expect(policy.documentsAccepted).toBe(false);
  });

  it("marks replacement documents ready for review when both are submitted", () => {
    const documents = [
      createDocument({ documentType: "valid_id", status: "submitted" }),
      createDocument({ documentType: "business_proof", status: "submitted" }),
      createDocument({ documentType: "valid_id", status: "superseded" }),
      createDocument({ documentType: "business_proof", status: "superseded" }),
    ];
    const policy = calculateBorrowerVerificationDocumentPolicy(
      documents,
      "needs_resubmission",
    );

    expect(policy.submittedDocumentTypes).toEqual([
      "valid_id",
      "business_proof",
    ]);
    expect(policy.readyForManagerReview).toBe(true);
    expect(policy.documentsAccepted).toBe(false);
  });

  it("tracks rejected document types separately", () => {
    const documents = [
      createDocument({ documentType: "valid_id", status: "rejected" }),
      createDocument({ documentType: "business_proof", status: "submitted" }),
    ];
    const policy = calculateBorrowerVerificationDocumentPolicy(documents);

    expect(policy.rejectedDocumentTypes).toEqual(["valid_id"]);
    expect(policy.submittedDocumentTypes).toEqual(["business_proof"]);
    expect(policy.acceptedDocumentTypes).toEqual([]);
    expect(policy.documentsAccepted).toBe(false);
  });
});

describe("loan application verification gate", () => {
  it("blocks submission when verification is null", () => {
    expect(canSubmitLoanApplicationForVerification(null)).toBe(false);
  });

  it("blocks submission when verification is missing", () => {
    const verification = createVerification({ status: "missing" });
    expect(canSubmitLoanApplicationForVerification(verification)).toBe(false);
  });

  it("blocks submission when verification is pending", () => {
    const verification = createVerification({ status: "pending" });
    expect(canSubmitLoanApplicationForVerification(verification)).toBe(false);
  });

  it("blocks submission when verification is approved but documents not accepted", () => {
    const verification = createVerification({
      status: "approved",
      documentPolicy: {
        requiredDocumentTypes: ["valid_id", "business_proof"],
        missingRequiredDocumentTypes: ["valid_id", "business_proof"],
        submittedDocumentTypes: [],
        acceptedDocumentTypes: [],
        rejectedDocumentTypes: [],
        readyForManagerReview: false,
        documentsAccepted: false,
      },
    });
    expect(canSubmitLoanApplicationForVerification(verification)).toBe(false);
  });

  it("blocks submission when verification needs resubmission", () => {
    const verification = createVerification({ status: "needs_resubmission" });
    expect(canSubmitLoanApplicationForVerification(verification)).toBe(false);
  });

  it("allows submission when verification is approved and documents accepted", () => {
    const verification = createVerification({
      status: "approved",
      documentPolicy: {
        requiredDocumentTypes: ["valid_id", "business_proof"],
        missingRequiredDocumentTypes: [],
        submittedDocumentTypes: ["valid_id", "business_proof"],
        acceptedDocumentTypes: ["valid_id", "business_proof"],
        rejectedDocumentTypes: [],
        readyForManagerReview: true,
        documentsAccepted: true,
      },
    });
    expect(canSubmitLoanApplicationForVerification(verification)).toBe(true);
  });
});

describe("verification messages", () => {
  it("returns guidance message when verification is null", () => {
    const message = getBorrowerVerificationMessage(null);
    expect(message).toContain("required");
  });

  it("returns approved message when verified with accepted documents", () => {
    const verification = createVerification({
      status: "approved",
      documentPolicy: {
        requiredDocumentTypes: ["valid_id", "business_proof"],
        missingRequiredDocumentTypes: [],
        submittedDocumentTypes: ["valid_id", "business_proof"],
        acceptedDocumentTypes: ["valid_id", "business_proof"],
        rejectedDocumentTypes: [],
        readyForManagerReview: true,
        documentsAccepted: true,
      },
    });
    expect(getBorrowerVerificationMessage(verification)).toContain("approved");
  });

  it("returns business proof guidance when approved verification is missing accepted business proof", () => {
    const verification = createVerification({
      status: "approved",
      documentPolicy: {
        requiredDocumentTypes: ["valid_id", "business_proof"],
        missingRequiredDocumentTypes: ["business_proof"],
        submittedDocumentTypes: ["valid_id"],
        acceptedDocumentTypes: ["valid_id"],
        rejectedDocumentTypes: [],
        readyForManagerReview: true,
        documentsAccepted: false,
      },
    });

    expect(canSubmitLoanApplicationForVerification(verification)).toBe(false);
    expect(getBorrowerVerificationMessage(verification)).toBe(
      "Upload and wait for approval of your business proof before applying.",
    );
  });

  it("returns upload message when documents are not ready for review", () => {
    const verification = createVerification({ status: "pending" });
    expect(getBorrowerVerificationMessage(verification)).toContain("Upload");
  });

  it("returns resubmission message when verification needs updates", () => {
    const verification = createVerification({ status: "needs_resubmission" });
    expect(getBorrowerVerificationMessage(verification)).toContain("updates");
  });

  it("returns checking message when documents are uploaded but not accepted", () => {
    const documents = [
      createDocument({ documentType: "valid_id", status: "submitted" }),
      createDocument({ documentType: "business_proof", status: "submitted" }),
    ];
    const verification = createVerification({
      status: "submitted",
      documents,
      documentPolicy: calculateBorrowerVerificationDocumentPolicy(documents),
    });
    expect(getBorrowerVerificationMessage(verification)).toContain("being checked");
  });
});
