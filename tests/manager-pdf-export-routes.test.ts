import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as borrowerExport } from "@/app/manager/borrower-verifications/[id]/export/route";
import { GET as lenderExport } from "@/app/manager/lenders/[id]/export/route";
import { requireManager } from "@/lib/access-control";
import {
  loadManagerBorrowerVerification,
  loadManagerLenderDetail,
} from "@/lib/manager-operations";

vi.mock("@/lib/access-control", () => ({
  requireManager: vi.fn(),
}));

vi.mock("@/lib/manager-operations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/manager-operations")>();
  return {
    ...actual,
    loadManagerBorrowerVerification: vi.fn(),
    loadManagerLenderDetail: vi.fn(),
  };
});

vi.mock("@/lib/manager-pdf-export", () => ({
  buildManagerExportFilename: vi.fn((type: string, name: string) => {
    const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return `lendfolio-${type}-${safeName}-2026-06-30.pdf`;
  }),
  generateApprovedBorrowerPdf: vi.fn(async () => new Uint8Array([37, 80, 68, 70])),
  generateApprovedLenderPdf: vi.fn(async () => new Uint8Array([37, 80, 68, 70])),
}));

const mockedRequireManager = vi.mocked(requireManager);
const mockedLoadBorrower = vi.mocked(loadManagerBorrowerVerification);
const mockedLoadLender = vi.mocked(loadManagerLenderDetail);

function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function mockManagerAccess() {
  mockedRequireManager.mockResolvedValue({
    ok: true,
    supabase: {} as never,
    profile: {} as never,
  });
}

const approvedLender = {
  id: "lender-profile-1",
  organizationName: "Kapital Partner",
  profile: { id: "lender-user-1", displayName: "Kapital Partner" },
  verificationStatus: "approved",
};

const pendingLender = {
  ...approvedLender,
  verificationStatus: "pending",
};

const approvedBorrower = {
  id: "verification-1",
  borrower: { id: "borrower-1", displayName: "Maria Santos" },
  verificationStatus: "approved",
};

const submittedBorrower = {
  ...approvedBorrower,
  verificationStatus: "submitted",
};

describe("manager PDF export routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an application/pdf response for approved lender exports", async () => {
    mockManagerAccess();
    mockedLoadLender.mockResolvedValue({
      ok: true,
      message: "Lender loaded.",
      lender: approvedLender as never,
    });

    const response = await lenderExport(
      new Request("https://lendfolio.test/manager/lenders/lender-profile-1/export") as never,
      routeContext("lender-profile-1"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain(
      "lendfolio-approved-lender-kapital-partner-2026-06-30.pdf",
    );
  });

  it("returns 400 for non-approved lender exports", async () => {
    mockManagerAccess();
    mockedLoadLender.mockResolvedValue({
      ok: true,
      message: "Lender loaded.",
      lender: pendingLender as never,
    });

    const response = await lenderExport(
      new Request("https://lendfolio.test/manager/lenders/lender-profile-1/export") as never,
      routeContext("lender-profile-1"),
    );

    expect(response.status).toBe(400);
  });

  it("returns an application/pdf response for approved borrower exports", async () => {
    mockManagerAccess();
    mockedLoadBorrower.mockResolvedValue({
      ok: true,
      message: "Borrower verification loaded.",
      verification: approvedBorrower as never,
    });

    const response = await borrowerExport(
      new Request(
        "https://lendfolio.test/manager/borrower-verifications/verification-1/export",
      ) as never,
      routeContext("verification-1"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain(
      "lendfolio-approved-borrower-maria-santos-2026-06-30.pdf",
    );
  });

  it("returns 400 for non-approved borrower exports", async () => {
    mockManagerAccess();
    mockedLoadBorrower.mockResolvedValue({
      ok: true,
      message: "Borrower verification loaded.",
      verification: submittedBorrower as never,
    });

    const response = await borrowerExport(
      new Request(
        "https://lendfolio.test/manager/borrower-verifications/verification-1/export",
      ) as never,
      routeContext("verification-1"),
    );

    expect(response.status).toBe(400);
  });

  it("returns 403 for non-manager access", async () => {
    mockedRequireManager.mockResolvedValue({
      ok: false,
      supabase: null,
      reason: "forbidden",
      message: "Your account does not have access to this workspace.",
    });

    const response = await lenderExport(
      new Request("https://lendfolio.test/manager/lenders/lender-profile-1/export") as never,
      routeContext("lender-profile-1"),
    );

    expect(response.status).toBe(403);
    expect(mockedLoadLender).not.toHaveBeenCalled();
  });
});
