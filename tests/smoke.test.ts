import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { borrowerPortfolioSchema } from "../lib/borrower-portfolio";
import {
  getManagerSubmittedDateRange,
  resolveSubmittedDateRangeFilters,
} from "../lib/date-ranges";
import { loanApplicationSchema } from "../lib/loan-application";
import { loanOfferSchema, mapLoanOfferRow } from "../lib/loan-offer";
import {
  createMetadataPreview,
  createScheduleSummary,
  getShortId,
} from "../lib/manager-operations";
import { formatDateOnly, formatDateTime } from "../lib/manager-date-format";
import { parseMoneyInput } from "../lib/money-input";
import { canAccessRole, isApprovedLender } from "../lib/role-rules";
import { isUuid } from "../lib/validation/uuid";
import {
  applyAcceptedOfferInvariant,
  canAcceptOffer,
  canReviewRepaymentProof,
  canDeclineOffer,
  canEditApplication,
  canWithdrawApplication,
} from "../lib/workflow-rules";

describe("product foundation", () => {
  it("names the product", () => {
    expect("LendFolio").toBe("LendFolio");
  });
});

describe("borrower portfolio schema", () => {
  it("accepts the MVP borrower portfolio fields", () => {
    const result = borrowerPortfolioSchema.safeParse({
      businessName: "Aling Nena Store",
      businessType: "sari_sari_store",
      location: "Quezon City",
      monthlyGrossRevenue: 45_000,
      monthlyExpenses: 28_000,
      existingLoanPayments: 3_500,
      yearsInOperation: 2,
      loanPurposeContext:
        "Additional working capital for inventory before the holiday season.",
    });

    expect(result.success).toBe(true);
  });

  it("rejects incomplete loan purpose context", () => {
    const result = borrowerPortfolioSchema.safeParse({
      businessName: "Nena Food Stall",
      businessType: "food_stall",
      location: "Cebu City",
      monthlyGrossRevenue: 20_000,
      monthlyExpenses: 15_000,
      existingLoanPayments: 0,
      yearsInOperation: 1,
      loanPurposeContext: "Inventory",
    });

    expect(result.success).toBe(false);
  });
});

describe("loan application schema", () => {
  it("accepts the loan application fields", () => {
    const result = loanApplicationSchema.safeParse({
      requestedAmount: 25_000,
      purpose: "Inventory restock",
      preferredTerm: "3_months",
      remarks: "Best reviewed after the saved portfolio cash-flow fields.",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid requested amount", () => {
    const result = loanApplicationSchema.safeParse({
      requestedAmount: 500,
      purpose: "Inventory restock",
      preferredTerm: "3_months",
      remarks: "",
    });

    expect(result.success).toBe(false);
  });

  it("shows friendly validation for empty numeric inputs", () => {
    const result = loanApplicationSchema.safeParse({
      requestedAmount: "",
      purpose: "Inventory restock",
      preferredTerm: "3_months",
      remarks: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.requestedAmount).toContain(
        "Enter the requested loan amount.",
      );
    }
  });
});

describe("money input parsing", () => {
  it("parses fast typed currency values without preserving a leading zero", () => {
    expect(parseMoneyInput("100")).toBe(100);
    expect(parseMoneyInput("0100")).toBe(100);
  });

  it("returns configured zero for empty optional money fields", () => {
    expect(parseMoneyInput("", { emptyValue: 0 })).toBe(0);
    expect(parseMoneyInput("   ", { emptyValue: 0 })).toBe(0);
  });

  it("keeps required empty money fields available for schema validation", () => {
    expect(parseMoneyInput("")).toBe("");
  });
});

describe("manager operations helpers", () => {
  it("formats manager date-only values without throwing on missing or invalid input", () => {
    expect(formatDateOnly(null)).toBe("Not provided");
    expect(formatDateOnly(undefined)).toBe("Not provided");
    expect(formatDateOnly("")).toBe("Not provided");
    expect(formatDateOnly("bad-date")).toBe("Not provided");
    expect(formatDateOnly("2026-05-25")).toBe("May 25, 2026");
    expect(formatDateOnly("2026-05-25T02:30:00.000Z")).toBe("May 25, 2026");
  });

  it("formats manager date-time values without throwing on missing or invalid input", () => {
    expect(formatDateTime(null)).toBe("Not reviewed");
    expect(formatDateTime(undefined)).toBe("Not reviewed");
    expect(formatDateTime("")).toBe("Not reviewed");
    expect(formatDateTime("bad-date")).toBe("Not provided");
    expect(formatDateTime("2026-05-25T02:30:00.000Z")).toContain(
      "May 25, 2026",
    );
  });

  it("summarizes preferred-term repayment schedules", () => {
    const summary = createScheduleSummary([
      { due_date: "2026-06-25", status: "verified" },
      { due_date: "2026-07-25", status: "submitted" },
      { due_date: "2026-08-25", status: "rejected" },
    ]);

    expect(summary).toEqual({
      installmentCount: 3,
      verifiedCount: 1,
      submittedCount: 1,
      rejectedCount: 1,
      nextDueDate: "2026-07-25",
    });
  });

  it("keeps audit metadata previews compact", () => {
    expect(getShortId("12345678-90ab-cdef-1234-567890abcdef")).toBe("12345678");
    expect(createMetadataPreview({ action: "repayment_verified" })).toContain(
      "repayment_verified",
    );
    expect(createMetadataPreview("x".repeat(220))).toHaveLength(180);
  });

  it("guards manager detail pages with manager access and clean user error states", () => {
    const userDetailPage = readFileSync(
      "app/manager/users/[id]/page.tsx",
      "utf8",
    );
    const proofDetailPage = readFileSync(
      "app/manager/repayments/[id]/page.tsx",
      "utf8",
    );

    expect(userDetailPage).toContain("getManagerAccess");
    expect(userDetailPage).toContain("Invalid user link");
    expect(userDetailPage).toContain("Received ID:");
    expect(userDetailPage).toContain("User not found");
    expect(userDetailPage).not.toContain("notFound()");
    expect(proofDetailPage).toContain("getManagerAccess");
    expect(proofDetailPage).toContain("notFound()");
  });

  it("keeps manager lookup and proof lists link-based instead of expandable", () => {
    const lookupPage = readFileSync("app/manager/lookup/page.tsx", "utf8");
    const repaymentsPage = readFileSync(
      "app/manager/repayments/page.tsx",
      "utf8",
    );

    expect(lookupPage).toContain("/manager/users/");
    expect(lookupPage).not.toContain("<details");
    expect(lookupPage).not.toContain("<summary");
    expect(repaymentsPage).toContain("/manager/repayments/");
    expect(repaymentsPage).not.toContain("<details");
    expect(repaymentsPage).not.toContain("<summary");
  });

  it("keeps manager loan lists compact and link-based", () => {
    const loansPage = readFileSync("app/manager/loans/page.tsx", "utf8");
    const loanDetailPage = readFileSync(
      "app/manager/loans/[id]/page.tsx",
      "utf8",
    );

    expect(loansPage).toContain("LoanFilters");
    expect(loansPage).toContain("LoansTable");
    expect(loansPage).toContain("LoanSummaryCards");
    expect(loansPage).toContain("loadManagerLoans");
    expect(loansPage).not.toContain("<FilterGrid");
    expect(loansPage).not.toContain("DataCard");
    expect(loansPage).not.toContain("/manager/loans/${getShortId");
    expect(loanDetailPage).toContain("loadManagerLoanDetail");
    expect(loanDetailPage).toContain("Invalid loan link");
    expect(loanDetailPage).toContain("Loan not found");
  });

  it("keeps manager application lists compact and links details by full UUID", () => {
    const applicationsPage = readFileSync(
      "app/manager/applications/page.tsx",
      "utf8",
    );
    const applicationDetailPage = readFileSync(
      "app/manager/applications/[id]/page.tsx",
      "utf8",
    );

    expect(applicationsPage).toContain("ApplicationFilters");
    expect(applicationsPage).toContain("ApplicationsTable");
    expect(applicationsPage).toContain("ApplicationSummaryCards");
    expect(applicationsPage).toContain("loadManagerApplications");
    expect(applicationsPage).not.toContain("<FilterGrid");
    expect(applicationsPage).not.toContain("DataCard");
    expect(applicationsPage).not.toContain("/manager/applications/${getShortId");
    expect(applicationDetailPage).toContain("loadManagerApplicationDetail");
    expect(applicationDetailPage).toContain("Invalid application link");
    expect(applicationDetailPage).toContain("Application not found");
  });

  it("keeps manager audit log lists compact and links details by full UUID", () => {
    const auditLogsPage = readFileSync("app/manager/audit-logs/page.tsx", "utf8");
    const auditLogDetailPage = readFileSync(
      "app/manager/audit-logs/[id]/page.tsx",
      "utf8",
    );

    expect(auditLogsPage).toContain("AutoFilterGrid");
    expect(auditLogsPage).toContain("ManagerDetailsLink");
    expect(auditLogsPage).toContain(
      "href={`/manager/audit-logs/${log.id}`}",
    );
    expect(auditLogsPage).toContain('name="action"');
    expect(auditLogsPage).toContain('name="targetTable"');
    expect(auditLogsPage).toContain('name="actor"');
    expect(auditLogsPage).toContain('name="createdFrom"');
    expect(auditLogsPage).toContain('name="createdTo"');
    expect(auditLogsPage).not.toContain("<FilterGrid");
    expect(auditLogsPage).not.toContain("  FilterGrid,");
    expect(auditLogsPage).not.toContain("DataCard");
    expect(auditLogsPage).not.toContain("/manager/audit-logs/${getShortId");
    expect(auditLogDetailPage).toContain("loadManagerAuditLogDetail");
    expect(auditLogDetailPage).toContain("Invalid audit log link");
    expect(auditLogDetailPage).toContain("Audit log not found");
    expect(auditLogDetailPage).toContain("JSON.stringify(log.metadata, null, 2)");
  });

  it("keeps manager auto-filtered pages free of apply and clear buttons", () => {
    const lookupPage = readFileSync("app/manager/lookup/page.tsx", "utf8");
    const auditLogsPage = readFileSync("app/manager/audit-logs/page.tsx", "utf8");

    for (const page of [lookupPage, auditLogsPage]) {
      expect(page).toContain("AutoFilterGrid");
      expect(page).not.toContain("<FilterGrid");
      expect(page).not.toContain("  FilterGrid,");
      expect(page).not.toContain("Apply");
      expect(page).not.toContain("Clear");
    }

    const loansPage = readFileSync("app/manager/loans/page.tsx", "utf8");
    const applicationsPage = readFileSync(
      "app/manager/applications/page.tsx",
      "utf8",
    );

    for (const page of [loansPage, applicationsPage]) {
      expect(page).not.toContain("<FilterGrid");
      expect(page).not.toContain("  FilterGrid,");
    }
  });

  it("keeps manager user detail links on full profile UUIDs", () => {
    const lookupPage = readFileSync("app/manager/lookup/page.tsx", "utf8");

    expect(lookupPage).toContain("function getManagerUserHref(id: string)");
    expect(lookupPage).toContain(
      "href={getManagerUserHref(user.profile.id)}",
    );
    expect(lookupPage).toContain(
      "href={getManagerUserHref(resultItem.borrower.id)}",
    );
    expect(lookupPage).not.toContain("/manager/users/${getShortId");
  });

  it("keeps manager bottom navigation focused with an Others menu", () => {
    const appBottomTabs = readFileSync(
      "components/app-bottom-tabs.tsx",
      "utf8",
    );
    const managerBottomTabs = readFileSync(
      "components/manager-bottom-tabs.tsx",
      "utf8",
    );
    const auditLogsPage = readFileSync("app/manager/audit-logs/page.tsx", "utf8");
    const applicationsPage = readFileSync(
      "app/manager/applications/page.tsx",
      "utf8",
    );

    expect(appBottomTabs).toContain('| "others"');
    expect(appBottomTabs).toContain("pointer-events-auto translate-y-0 opacity-100");
    expect(appBottomTabs).toContain("pointer-events-none translate-y-6 opacity-0");
    expect(appBottomTabs).toContain("aria-hidden={isFloatingMenuOpen ? undefined : true}");
    expect(appBottomTabs).toContain("aria-expanded=");
    expect(appBottomTabs).toContain("onAnyTabPress?:");
    expect(appBottomTabs).toContain("navRef.current?.contains(target)");
    expect(appBottomTabs).toContain("!isVisible && isFloatingMenuOpen");
    expect(appBottomTabs).toContain("transform 280ms cubic-bezier(0.16, 1, 0.3, 1)");
    expect(appBottomTabs).toContain("transition-all duration-200 ease-out active:scale-[0.97]");
    expect(appBottomTabs).toContain("motion-reduce:transition-none");

    expect(managerBottomTabs).toContain('label: "Home"');
    expect(managerBottomTabs).toContain('label: "Users"');
    expect(managerBottomTabs).toContain('label: "Loans"');
    expect(managerBottomTabs).toContain('label: "Others"');
    expect(managerBottomTabs).not.toContain('label: "Proofs",\n    icon: "proofs",\n    href: "/manager/repayments"');
    expect(managerBottomTabs).toContain("/manager/audit-logs");
    expect(managerBottomTabs).toContain("/manager/repayments");
    expect(managerBottomTabs).toContain("/manager/applications");
    expect(managerBottomTabs).toContain("More manager sections");
    expect(managerBottomTabs).toContain('label: "Apps"');
    expect(managerBottomTabs).toContain('ariaLabel: "Applications and offers"');
    expect(managerBottomTabs).toContain("rounded-full");
    expect(managerBottomTabs).toContain("origin-bottom");
    expect(managerBottomTabs).toContain("duration-300");
    expect(managerBottomTabs).toContain(
      "-translate-y-7 scale-105 hover:-translate-y-8 hover:scale-110",
    );
    expect(managerBottomTabs).toContain("hover:scale-105");
    expect(managerBottomTabs).toContain("active:scale-95");
    expect(managerBottomTabs).toContain('style={{ transitionDelay: `${index * 45}ms` }}');
    expect(managerBottomTabs).toContain('activeTab={visibleActiveTab}');
    expect(managerBottomTabs).toContain("onAnyTabPress=");
    expect(managerBottomTabs).not.toContain("grid grid-cols-3 gap-2 rounded-3xl");
    expect(managerBottomTabs).toContain("isOthersOpen ||");
    expect(managerBottomTabs).toContain('activeTab === "proofs"');
    expect(managerBottomTabs).toContain('activeTab === "audit"');
    expect(managerBottomTabs).toContain('activeTab === "applications"');
  });

  it("accepts UUID-shaped seeded IDs but rejects short user IDs", () => {
    expect(isUuid("33333333-3333-3333-3333-333333333333")).toBe(true);
    expect(isUuid("11111111-1111-1111-1111-111111111111")).toBe(true);
    expect(isUuid("33333333")).toBe(false);
  });

  it("maps proof date presets to submitted_at bounds using Manila dates", () => {
    const now = new Date("2026-05-25T04:00:00.000Z");

    expect(getManagerSubmittedDateRange("this_week", now)).toEqual({
      submittedFrom: "2026-05-25",
      submittedTo: "2026-05-31",
    });
    expect(resolveSubmittedDateRangeFilters({ range: "this_week", now })).toEqual({
      submittedFrom: "2026-05-25T00:00:00.000+08:00",
      submittedTo: "2026-05-31T23:59:59.999+08:00",
    });
    expect(resolveSubmittedDateRangeFilters({ range: "this_month", now })).toEqual({
      submittedFrom: "2026-05-01T00:00:00.000+08:00",
      submittedTo: "2026-05-31T23:59:59.999+08:00",
    });
    expect(resolveSubmittedDateRangeFilters({ range: "this_year", now })).toEqual({
      submittedFrom: "2026-01-01T00:00:00.000+08:00",
      submittedTo: "2026-12-31T23:59:59.999+08:00",
    });
    expect(
      resolveSubmittedDateRangeFilters({
        range: "custom",
        submittedFrom: "2026-05-10",
        submittedTo: "2026-05-12",
      }),
    ).toEqual({
      submittedFrom: "2026-05-10T00:00:00.000+08:00",
      submittedTo: "2026-05-12T23:59:59.999+08:00",
    });
    expect(
      resolveSubmittedDateRangeFilters({
        submittedFrom: "2026-05-10",
      }),
    ).toEqual({
      submittedFrom: "2026-05-10T00:00:00.000+08:00",
      submittedTo: undefined,
    });
  });
});

describe("borrower workflow actions", () => {
  it("allows application edits and withdrawals only while open", () => {
    expect(canEditApplication("submitted")).toBe(true);
    expect(canEditApplication("open")).toBe(true);
    expect(canEditApplication("accepted")).toBe(false);
    expect(canEditApplication("withdrawn")).toBe(false);
    expect(canEditApplication("declined")).toBe(false);

    expect(canWithdrawApplication("submitted")).toBe(true);
    expect(canWithdrawApplication("accepted")).toBe(false);
  });

  it("allows borrowers to decline only their own pending open offers", () => {
    expect(
      canDeclineOffer({
        actorId: "borrower-1",
        borrowerId: "borrower-1",
        offerStatus: "pending",
        applicationStatus: "open",
      }),
    ).toBe(true);
    expect(
      canDeclineOffer({
        actorId: "borrower-2",
        borrowerId: "borrower-1",
        offerStatus: "pending",
        applicationStatus: "open",
      }),
    ).toBe(false);
    expect(
      canDeclineOffer({
        actorId: "borrower-1",
        borrowerId: "borrower-1",
        offerStatus: "declined",
        applicationStatus: "open",
      }),
    ).toBe(false);
  });

  it("allows lenders to review only submitted repayment proofs", () => {
    expect(canReviewRepaymentProof("submitted")).toBe(true);
    expect(canReviewRepaymentProof("verified")).toBe(false);
    expect(canReviewRepaymentProof("rejected")).toBe(false);
  });
});

describe("loan offer schema", () => {
  it("accepts pending offer fields", () => {
    const result = loanOfferSchema.safeParse({
      approvedAmount: 20_000,
      repaymentAmount: 22_000,
      fees: 500,
      dueDate: "2026-07-24",
      remarks: "Offer is based on submitted portfolio cash flow.",
    });

    expect(result.success).toBe(true);
  });

  it("rejects repayment below approved amount", () => {
    const result = loanOfferSchema.safeParse({
      approvedAmount: 20_000,
      repaymentAmount: 19_000,
      fees: 0,
      dueDate: "2026-07-24",
      remarks: "",
    });

    expect(result.success).toBe(false);
  });
});

describe("borrower offer acceptance", () => {
  it("maps accepted and declined offer statuses for borrower review", () => {
    const baseOffer = {
      id: "offer-1",
      loan_application_id: "application-1",
      borrower_id: "borrower-1",
      lender_id: "lender-1",
      lender_name: "Partner Capital",
      approved_amount: 20_000,
      repayment_amount: 22_000,
      fees: 500,
      due_date: "2026-07-24",
      remarks: "Offer is based on submitted portfolio cash flow.",
      sent_at: "2026-05-24T08:00:00.000Z",
      created_at: "2026-05-24T08:00:00.000Z",
      updated_at: "2026-05-24T08:00:00.000Z",
    };

    expect(mapLoanOfferRow({ ...baseOffer, status: "accepted" })).toMatchObject({
      applicationId: "application-1",
      lenderName: "Partner Capital",
      status: "accepted",
    });
    expect(mapLoanOfferRow({ ...baseOffer, status: "declined" })).toMatchObject({
      status: "declined",
    });
  });

  it("accepts one pending offer and declines competing pending offers", () => {
    const result = applyAcceptedOfferInvariant({
      actorId: "borrower-1",
      selectedOfferId: "offer-1",
      applicationStatus: "open",
      offers: [
        {
          id: "offer-1",
          loanApplicationId: "application-1",
          borrowerId: "borrower-1",
          status: "pending",
        },
        {
          id: "offer-2",
          loanApplicationId: "application-1",
          borrowerId: "borrower-1",
          status: "pending",
        },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.offers).toEqual([
      expect.objectContaining({ id: "offer-1", status: "accepted" }),
      expect.objectContaining({ id: "offer-2", status: "declined" }),
    ]);
    expect(
      result.offers.filter(
        (offer: { status: string }) => offer.status === "accepted",
      ),
    ).toHaveLength(1);
  });

  it("prevents a borrower from accepting another borrower's offer", () => {
    expect(
      canAcceptOffer({
        actorId: "borrower-2",
        borrowerId: "borrower-1",
        offerStatus: "pending",
        applicationStatus: "open",
      }),
    ).toBe(false);
  });

  it("rejects acceptance when the application is already closed", () => {
    expect(
      canAcceptOffer({
        actorId: "borrower-1",
        borrowerId: "borrower-1",
        offerStatus: "pending",
        applicationStatus: "accepted",
      }),
    ).toBe(false);
  });
});

describe("role helper logic", () => {
  it("allows only active matching roles into role workspaces", () => {
    expect(
      canAccessRole(
        {
          role: "borrower",
          status: "active",
        },
        "borrower",
      ),
    ).toBe(true);
    expect(
      canAccessRole(
        {
          role: "borrower",
          status: "suspended",
        },
        "borrower",
      ),
    ).toBe(false);
  });

  it("requires approved lender status before offer creation", () => {
    expect(
      isApprovedLender({
        role: "lender",
        status: "active",
        lenderProfile: {
          verification_status: "approved",
        },
      }),
    ).toBe(true);
    expect(
      isApprovedLender({
        role: "lender",
        status: "active",
        lenderProfile: {
          verification_status: "pending",
        },
      }),
    ).toBe(false);
  });
});

describe("database workflow safeguards", () => {
  it("defines the accepted-offer uniqueness invariant", () => {
    const migration = readFileSync(
      "supabase/migrations/20260524073652_harden_foundation_profiles_rls_workflow.sql",
      "utf8",
    );

    expect(migration).toContain(
      "loan_offers_one_accepted_per_application_idx",
    );
    expect(migration).toContain("where status = 'accepted'");
  });

  it("defines the atomic offer acceptance RPC", () => {
    const migration = readFileSync(
      "supabase/migrations/20260524142104_add_active_loans.sql",
      "utf8",
    );

    expect(migration).toContain("function app_private.accept_loan_offer");
    expect(migration).toContain("offer_accepted");
    expect(migration).toContain("competing_offers_declined");
    expect(migration).toContain("application_accepted");
    expect(migration).toContain("loan_activated");
    expect(migration).toContain("repayment_schedule_created");
  });

  it("defines active loan and repayment schedule safeguards", () => {
    const migration = readFileSync(
      "supabase/migrations/20260524142104_add_active_loans.sql",
      "utf8",
    );

    expect(migration).toContain("create table if not exists public.active_loans");
    expect(migration).toContain("active_loans_one_per_application");
    expect(migration).toContain("active_loans_one_per_accepted_offer");
    expect(migration).toContain(
      "create table if not exists public.loan_repayment_schedules",
    );
    expect(migration).toContain(
      "loan_repayment_schedules_installment_unique",
    );
    expect(migration).toContain("active_loans_select_access");
    expect(migration).toContain("loan_repayment_schedules_select_access");
  });

  it("defines repayment proof storage, RLS, and review safeguards", () => {
    const migration = readFileSync(
      "supabase/migrations/20260524145301_add_repayment_proofs.sql",
      "utf8",
    );

    expect(migration).toContain("create type public.repayment_proof_status");
    expect(migration).toContain("create table if not exists public.repayment_proofs");
    expect(migration).toContain("repayment_proofs_one_submitted_per_schedule_idx");
    expect(migration).toContain("repayment_proofs_one_verified_per_schedule_idx");
    expect(migration).toContain("repayment-proofs");
    expect(migration).toContain("repayment_proofs_select_access");
    expect(migration).toContain("storage_repayment_proofs_borrower_insert");
    expect(migration).toContain("function app_private.submit_repayment_proof");
    expect(migration).toContain("function app_private.review_repayment_proof");
    expect(migration).toContain("loan_balance_updated");
  });

  it("hardens repayment proof re-upload lifecycle", () => {
    const migration = readFileSync(
      "supabase/migrations/20260525014423_harden_repayment_proof_lifecycle_v2.sql",
      "utf8",
    );

    expect(migration).toContain("loan_repayment_schedules.status in ('due', 'late', 'rejected')");
    expect(migration).toContain("A proof is already waiting for lender review.");
    expect(migration).toContain("This repayment is already verified.");
    expect(migration).toContain("'repayment_proof_submitted'");
    expect(migration).toContain("'repayment_proof_rejected'");
    expect(migration).toContain("'repayment_proof_verified'");
    expect(migration).toContain("'loan_balance_updated'");
  });

  it("moves offer creation into an approved-lender RPC", () => {
    const migration = readFileSync(
      "supabase/migrations/20260525013039_harden_offer_workflow_and_repayment_schedules.sql",
      "utf8",
    );

    expect(migration).toContain("function app_private.create_loan_offer");
    expect(migration).toContain("for update");
    expect(migration).toContain("revoke insert on public.loan_offers");
    expect(migration).toContain("app_private.is_approved_lender");
  });

  it("defines accepted-lender closed-context visibility and term schedules", () => {
    const migration = readFileSync(
      "supabase/migrations/20260525013039_harden_offer_workflow_and_repayment_schedules.sql",
      "utf8",
    );

    expect(migration).toContain(
      "lender_has_accepted_offer_on_application",
    );
    expect(migration).toContain("portfolio_has_accepted_lender_offer");
    expect(migration).toContain("loan_applications_select_access");
    expect(migration).toContain("borrower_portfolios_select_access");
    expect(migration).toContain("v_installment_count := case");
    expect(migration).toContain("repayment_schedule_created");
  });
});
