import { describe, expect, it } from "vitest";
import { generateApprovedLenderPdf } from "@/lib/manager-pdf-export";

describe("manager PDF export generation", () => {
  it("generates lender PDFs with peso and dash characters safely", async () => {
    const bytes = await generateApprovedLenderPdf({
      id: "589313b0-0000-4000-8000-000000000001",
      userId: "33333333-0000-4000-8000-000000000001",
      profile: {
        id: "33333333-0000-4000-8000-000000000001",
        displayName: "Approved Capital",
      },
      organizationName: "Approved Capital",
      contactPerson: "Ana Reyes",
      phoneNumber: "+63 917 555 0101",
      businessAddress: "12 Finance Street, Makati City",
      addressRegion: null,
      addressCityOrMunicipality: null,
      addressBarangay: null,
      addressZipCode: null,
      operatingArea: "Metro Manila",
      businessRegistrationNumber: "BRN-APPROVED-001",
      minLoanAmount: 5000,
      maxLoanAmount: 75000,
      typicalRepaymentTerms: "1 to 6 months with monthly repayment",
      lenderDescription:
        "Community lender focused on working capital – neighborhood merchants.",
      verificationStatus: "approved",
      approvedAt: "2026-06-30T00:18:00.000Z",
      approvedBy: { id: "manager-1", displayName: "Platform Manager" },
      rejectedAt: null,
      rejectedBy: null,
      managerReviewNotes: null,
      rejectionReason: null,
      consentStatus: {} as never,
      documentPolicy: {} as never,
      documents: [],
      changeRequests: [],
      createdAt: "2026-06-30T00:18:00.000Z",
      updatedAt: "2026-06-30T00:18:00.000Z",
    } as never);

    expect(Array.from(bytes.slice(0, 4))).toEqual([37, 80, 68, 70]);
  });
});
