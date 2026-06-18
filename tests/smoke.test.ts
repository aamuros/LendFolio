import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { borrowerPortfolioSchema } from "../lib/borrower-portfolio";
import { evaluateBorrowerReadiness } from "../lib/borrower-readiness";
import {
  canSubmitLoanApplicationForVerification,
  type BorrowerVerificationSummary,
} from "../lib/borrower-verification";
import { getRouteForRole } from "../lib/app-roles";
import {
  buildConsentStatus,
  type UserConsentRecord,
  CURRENT_CONSENT_VERSIONS,
} from "../lib/consents";
import {
  getManagerSubmittedDateRange,
  resolveSubmittedDateRangeFilters,
} from "../lib/date-ranges";
import {
  loanApplicationSchema,
  loanPurposeOptions,
  mapLoanApplicationRow,
} from "../lib/loan-application";
import { isApplicationActionableForOffer } from "../lib/lender-applications";
import { loanOfferSchema, mapLoanOfferRow } from "../lib/loan-offer";
import {
  buildDueItemsByDate,
  getRepaymentActionSummary,
  getRepaymentCalendarDateTone,
  isBlockingApplicationReadinessStatus,
  shouldShowNeedsReviewApplicationWarning,
} from "../components/borrower-loan-application-panel";
import {
  createMetadataPreview,
  createScheduleSummary,
  getShortId,
} from "../lib/manager-operations";
import { formatDateOnly, formatDateTime } from "../lib/manager-date-format";
import { parseMoneyInput } from "../lib/money-input";
import { canAccessRole, hasPrimaryRole, isApprovedLender } from "../lib/role-rules";
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
      address: {
        regionCode: "NCR",
        regionName: "NCR - National Capital Region",
        cityOrMunicipality: "Quezon City",
        barangay: "Diliman",
        zipCode: "1100",
      },
      monthlyGrossRevenue: 45_000,
      monthlyExpenses: 28_000,
      existingLoanPayments: 3_500,
      yearsInOperation: 2,
      mainProductsOrServicesCategory: "groceries_household_items",
      hasBusinessRegistration: false,
      loanPurposeContext:
        "Additional working capital for inventory before the holiday season.",
    });

    expect(result.success).toBe(true);
  });

  it("accepts short loan purpose context when optional", () => {
    const result = borrowerPortfolioSchema.safeParse({
      businessName: "Nena Food Stall",
      businessType: "food_stall",
      location: "Cebu City",
      address: {
        regionCode: "Region VII",
        regionName: "Region VII - Central Visayas",
        cityOrMunicipality: "Cebu City",
        barangay: "Lahug",
        zipCode: "6000",
      },
      monthlyGrossRevenue: 20_000,
      monthlyExpenses: 15_000,
      existingLoanPayments: 0,
      yearsInOperation: 1,
      mainProductsOrServicesCategory: "food_beverages",
      hasBusinessRegistration: false,
      loanPurposeContext: "Inventory",
    });

    expect(result.success).toBe(true);
  });
});

describe("loan application schema", () => {
  it("accepts the loan application fields", () => {
    const result = loanApplicationSchema.safeParse({
      requestedAmount: 25_000,
      purpose: "Inventory purchase",
      preferredTerm: "3_months",
      remarks: "Best reviewed after the saved portfolio cash-flow fields.",
    });

    expect(result.success).toBe(true);
  });

  it("accepts empty remarks", () => {
    const result = loanApplicationSchema.safeParse({
      requestedAmount: 25_000,
      purpose: loanPurposeOptions[0],
      preferredTerm: "3_months",
      remarks: "",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an empty purpose", () => {
    const result = loanApplicationSchema.safeParse({
      requestedAmount: 25_000,
      purpose: "",
      preferredTerm: "3_months",
      remarks: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects arbitrary purpose text", () => {
    const result = loanApplicationSchema.safeParse({
      requestedAmount: 25_000,
      purpose: "Inventory restock",
      preferredTerm: "3_months",
      remarks: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects remarks over 500 characters", () => {
    const result = loanApplicationSchema.safeParse({
      requestedAmount: 25_000,
      purpose: "Inventory purchase",
      preferredTerm: "3_months",
      remarks: "x".repeat(501),
    });

    expect(result.success).toBe(false);
  });

  it("rejects an invalid requested amount", () => {
    const result = loanApplicationSchema.safeParse({
      requestedAmount: 500,
      purpose: "Inventory purchase",
      preferredTerm: "3_months",
      remarks: "",
    });

    expect(result.success).toBe(false);
  });

  it("shows friendly validation for empty numeric inputs", () => {
    const result = loanApplicationSchema.safeParse({
      requestedAmount: "",
      purpose: "Inventory purchase",
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

describe("loan application mapping", () => {
  const baseApplicationRow = {
    id: "application-1",
    borrower_id: "borrower-1",
    borrower_portfolio_id: "portfolio-1",
    requested_amount: 25000,
    credit_limit_at_submission: 50000,
    used_credit_at_submission: 0,
    available_credit_at_submission: 50000,
    monthly_net_cash_flow_at_submission: 18000,
    credit_readiness_status: "eligible_to_apply" as const,
    borrower_profile_snapshot: {
      monthly_gross_revenue: 60000,
      monthly_expenses: 32000,
      existing_loan_payments: 10000,
      years_in_operation: 3,
      revenue_confidence: "document_supported",
      profile_review_status: "approved",
    },
    borrower_readiness_snapshot: {
      readiness_status: "eligible_to_apply",
      profile_readiness: {
        risk_flags: [],
      },
    },
    borrower_credit_profile_grade: null,
    borrower_credit_profile_assessment: null,
    purpose: "Inventory purchase",
    preferred_term: "3_months" as const,
    remarks: null,
    status: "submitted" as const,
    submitted_at: "2026-06-18T00:00:00.000Z",
    borrower_removed_at: null,
    created_at: "2026-06-18T00:00:00.000Z",
    updated_at: "2026-06-18T00:00:00.000Z",
  };

  it("derives a credit profile grade for older application rows", () => {
    const application = mapLoanApplicationRow(baseApplicationRow);

    expect(application.creditProfileGrade).toBe("A");
    expect(application.creditProfileAssessment?.grade).toBe("A");
    expect(application.creditProfileAssessmentSource).toBe("derived");
  });

  it("preserves stored credit profile assessments", () => {
    const application = mapLoanApplicationRow({
      ...baseApplicationRow,
      borrower_credit_profile_grade: "B",
      borrower_credit_profile_assessment: {
        grade: "B",
        label: "Acceptable profile",
        summary: "Stored assessment.",
        positiveFactors: [],
        riskFactors: [],
        improvementActions: [],
        inputs: {
          readinessStatus: "eligible_to_apply",
          monthlyNetCashFlow: 18000,
          debtBurdenRatio: 0.1,
          availableCredit: 50000,
          calculatedCreditLimit: 50000,
          usedCredit: 0,
        },
      },
    });

    expect(application.creditProfileGrade).toBe("B");
    expect(application.creditProfileAssessment?.summary).toBe(
      "Stored assessment.",
    );
    expect(application.creditProfileAssessmentSource).toBe("stored");
  });
});

describe("borrower apply readiness gating", () => {
  it("does not block needs_review borrowers from the apply form", () => {
    expect(isBlockingApplicationReadinessStatus("needs_review")).toBe(false);
    expect(
      shouldShowNeedsReviewApplicationWarning({
        readinessStatus: "needs_review",
        missingFields: [],
        riskFlags: ["no_business_proof"],
        monthlyNetCashFlow: 10_000,
        debtBurdenRatio: null,
        profileIsStale: false,
        nextActions: [
          "Next, upload your business proof so your profile can be reviewed.",
        ],
      }),
    ).toBe(true);
  });

  it("keeps incomplete and not_eligible borrowers blocked", () => {
    expect(isBlockingApplicationReadinessStatus("incomplete")).toBe(true);
    expect(isBlockingApplicationReadinessStatus("not_eligible")).toBe(true);
    expect(isBlockingApplicationReadinessStatus("eligible_to_apply")).toBe(false);
  });

  it("keeps the needs_review warning visible above the application form", () => {
    const source = readFileSync(
      "components/borrower-loan-application-panel.tsx",
      "utf8",
    );

    expect(source).toContain("shouldShowNeedsReviewApplicationWarning(readiness)");
    expect(source).toContain("<NeedsReviewApplicationWarning />");
    expect(source).toContain("isBlockingApplicationReadinessStatus(readiness.readinessStatus)");
  });

  it("uses principal-only available credit copy", () => {
    const source = readFileSync(
      "components/borrower-loan-application-panel.tsx",
      "utf8",
    );

    expect(source).toContain(
      "This is the maximum principal you can request. Interest and",
    );
    expect(source).not.toContain(
      "The total repayment (principal + interest + fees) must fit",
    );
  });
});

describe("borrower application readiness migration", () => {
  const migrationPath =
    "supabase/migrations/20260618110000_allow_needs_review_without_stale_blocker.sql";

  it("allows needs_review profile readiness without appending profile_needs_review", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toContain(
      "create or replace function app_private.borrower_application_readiness",
    );
    expect(migration).toContain("v_profile_status = 'needs_review'");
    expect(migration).toContain(
      "then 'needs_review'::public.borrower_credit_readiness_status",
    );
    expect(migration).toContain("'ok', cardinality(v_codes) = 0");
    expect(migration).toContain(
      "'application_ready', cardinality(v_codes) = 0",
    );
    expect(migration).toContain("'profile_readiness', v_profile_readiness");
    expect(migration).not.toContain("'profile_needs_review'");
    expect(migration).not.toContain("'profile_stale'");
  });

  it("keeps incomplete and not_eligible profile readiness as hard blockers", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toContain("if v_profile_status = 'incomplete' then");
    expect(migration).toContain("v_codes := array_append(v_codes, 'profile_incomplete');");
    expect(migration).toContain("elsif v_profile_status = 'not_eligible' then");
    expect(migration).toContain("v_codes := array_append(v_codes, 'not_eligible');");
  });

  it("submits applications using the readiness application_ready flag and stores needs_review snapshots", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toContain(
      "create or replace function app_private.submit_loan_application",
    );
    expect(migration).toContain(
      "if not coalesce((v_readiness->>'application_ready')::boolean, false) then",
    );
    expect(migration).toContain("borrower_readiness_snapshot");
    expect(migration).toContain(
      "coalesce(nullif(v_readiness->>'readiness_status', ''), 'eligible_to_apply')::public.borrower_credit_readiness_status",
    );
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

  it("loads lender verification documents with signed preview URLs", () => {
    const lenderPage = readFileSync("app/lender/page.tsx", "utf8");

    expect(lenderPage).toContain("includeSignedUrls: true");
  });

  it("keeps signup from silently redirecting active sessions into a workspace", () => {
    const signupPage = readFileSync("app/signup/page.tsx", "utf8");

    expect(signupPage).toContain("Account already signed in");
    expect(signupPage).toContain("Continue to workspace");
    expect(signupPage).toContain("Sign out and create account");
    expect(signupPage).not.toContain(
      "redirect(getRouteForRole(access.profile.role)",
    );
  });

  it("keeps signup role mismatch from redirecting to the provisioned profile workspace", () => {
    const signupActions = readFileSync("app/signup/actions.ts", "utf8");

    expect(signupActions).toContain("profile.role !== input.role");
    expect(signupActions).toContain("await supabase.auth.signOut()");
    expect(signupActions).toContain("getRoleMismatchMessage(profile.role, input.role)");
    expect(signupActions).not.toContain("profile.role === \"lender\"");
    expect(signupActions).not.toContain("? \"/lender/onboarding\"");
  });

  it("restores signup form role state after validation errors", () => {
    const signupForm = readFileSync("app/signup/signup-form.tsx", "utf8");

    expect(signupForm).toContain("isSignupRole(state.values?.role)");
    expect(signupForm).toContain("key={formKey}");
    expect(signupForm).toContain('<input type="hidden" name="role" value={role} />');
    expect(signupForm).toContain("submittedRole !== role");
  });

  it("keeps lender workspace pages behind primary lender access", () => {
    const lenderPage = readFileSync("app/lender/page.tsx", "utf8");
    const applicationsPage = readFileSync(
      "app/lender/applications/page.tsx",
      "utf8",
    );

    expect(lenderPage).toContain('requirePrimaryRole("lender")');
    expect(applicationsPage).toContain('requirePrimaryRole("lender")');
    expect(lenderPage).not.toContain("getCurrentUserProfile()");
  });

  it("keeps document previews useful for PDFs, images, and failed renders", () => {
    const previewDialog = readFileSync(
      "components/document-preview-dialog.tsx",
      "utf8",
    );
    const lenderDocumentsPanel = readFileSync(
      "components/lender-verification-documents-panel.tsx",
      "utf8",
    );

    expect(previewDialog).toContain('fileType === "application/pdf"');
    expect(previewDialog).toContain('fileType === "image/jpeg"');
    expect(previewDialog).toContain('fileType === "image/png"');
    expect(previewDialog).toContain("Loading preview...");
    expect(previewDialog).toContain(
      "Preview unavailable, download file instead.",
    );
    expect(previewDialog).toContain("Invalid or missing file URL.");
    expect(previewDialog).toContain("Open file");
    expect(lenderDocumentsPanel).toContain("URL.createObjectURL(file)");
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

    expect(auditLogsPage).toContain("FilterForm");
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
      expect(page).toContain("FilterForm");
      expect(page).not.toContain("<FilterGrid");
      expect(page).not.toContain("  FilterGrid,");
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

  it("uses primary color pair for active bottom tab contrast", () => {
    const appBottomTabs = readFileSync(
      "components/app-bottom-tabs.tsx",
      "utf8",
    );

    expect(appBottomTabs).toContain("bg-primary");
    expect(appBottomTabs).toContain("text-primary-foreground");
    expect(appBottomTabs).toContain("[&>span]:text-primary-foreground");
    expect(appBottomTabs).toContain("[&_svg]:text-primary-foreground");
    expect(appBottomTabs).not.toContain("bg-foreground text-background");
  });

  it("keeps lender bottom navigation mobile-only on all lender pages", () => {
    const lenderPage = readFileSync("app/lender/page.tsx", "utf8");
    const applicationsPage = readFileSync(
      "app/lender/applications/page.tsx",
      "utf8",
    );
    const applicationDetailPage = readFileSync(
      "app/lender/applications/[id]/page.tsx",
      "utf8",
    );
    const applicationsErrorPage = readFileSync(
      "app/lender/applications/error.tsx",
      "utf8",
    );

    for (const page of [lenderPage, applicationsPage, applicationDetailPage, applicationsErrorPage]) {
      expect(page).toContain('className="sm:hidden"');
      expect(page).toContain("<LenderBottomTabs");
    }
  });

  it("keeps borrower bottom navigation mobile-only in borrower-workspace", () => {
    const borrowerWorkspace = readFileSync(
      "components/borrower-workspace.tsx",
      "utf8",
    );

    expect(borrowerWorkspace).toContain('<div className="sm:hidden">');
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
      interestServiceChargeRate: 7.5,
      fees: 500,
      dueDate: "2026-07-24",
      remarks: "Offer is based on submitted portfolio cash flow.",
      repaymentChannel: "GCash",
      repaymentAccountName: "Partner Capital",
      repaymentAccountNumber: "09171234567",
      repaymentInstructions: "",
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error("Expected offer schema to accept valid fields.");
    }
    expect(result.data.repaymentAmount).toBe(22_000);
  });

  it("rejects negative interest or service charge rate", () => {
    const result = loanOfferSchema.safeParse({
      approvedAmount: 20_000,
      interestServiceChargeRate: -1,
      fees: 0,
      dueDate: "2026-07-24",
      remarks: "",
      repaymentChannel: "GCash",
      repaymentAccountName: "Partner Capital",
      repaymentAccountNumber: "09171234567",
      repaymentInstructions: "",
    });

    expect(result.success).toBe(false);
  });
});

describe("borrower repayment calendar helpers", () => {
  const today = new Date("2026-05-31T00:00:00");

  function repayment(
    id: string,
    status: "due" | "late" | "submitted" | "verified" | "rejected",
    dueDate: string,
    amountDue = 1000,
  ) {
    return {
      id,
      activeLoanId: "loan-1",
      borrowerId: "borrower-1",
      lenderId: "lender-1",
      installmentNumber: 1,
      amountDue,
      dueDate,
      status,
      latestProof: status === "verified" ? { status: "verified" } : null,
      proofs: [],
    };
  }

  function loan(schedule: ReturnType<typeof repayment>[]) {
    return {
      id: "loan-1",
      applicationId: "application-1",
      acceptedOfferId: "offer-1",
      borrowerId: "borrower-1",
      lenderId: "lender-1",
      principalAmount: 20000,
      repaymentAmount: 22000,
      totalRepaymentAmount: 22000,
      fees: 500,
      interestAmount: 1500,
      outstandingBalance: 22000,
      status: "active",
      startedAt: "2026-05-01T00:00:00.000Z",
      dueDate: "2026-07-31",
      schedule,
    };
  }

  it("includes verified repayments in calendar date items", () => {
    const itemsByDate = buildDueItemsByDate([
      loan([repayment("repayment-1", "verified", "2026-06-30")]),
    ] as never);

    expect(itemsByDate.get("2026-06-30")).toHaveLength(1);
  });

  it("prioritizes calendar date tone by repayment state", () => {
    expect(
      getRepaymentCalendarDateTone(
        [{ loan: loan([]), repayment: repayment("paid", "verified", "2026-06-30") }] as never,
        today,
      ),
    ).toBe("success");
    expect(
      getRepaymentCalendarDateTone(
        [{ loan: loan([]), repayment: repayment("review", "submitted", "2026-06-30") }] as never,
        today,
      ),
    ).toBe("neutral");
    expect(
      getRepaymentCalendarDateTone(
        [{ loan: loan([]), repayment: repayment("upcoming", "due", "2026-06-30") }] as never,
        today,
      ),
    ).toBe("attention");
    expect(
      getRepaymentCalendarDateTone(
        [
          { loan: loan([]), repayment: repayment("paid", "verified", "2026-06-30") },
          { loan: loan([]), repayment: repayment("late", "late", "2026-06-30") },
        ] as never,
        today,
      ),
    ).toBe("danger");
  });

  it("includes prior-month overdue repayments in needs-action total", () => {
    const summary = getRepaymentActionSummary([
      loan([
        repayment("overdue", "due", "2026-04-30", 1200),
        repayment("current", "due", "2026-06-30", 1500),
        repayment("submitted", "submitted", "2026-05-20", 900),
      ]),
    ] as never);

    expect(summary.overdueAmount).toBe(1200);
    expect(summary.dueThisMonthAmount).toBe(1500);
    expect(summary.submittedAmount).toBe(900);
    expect(summary.totalNeedsAction).toBe(2700);
  });
});

describe("lender application offer actionability", () => {
  it("treats declined and expired offers as actionable re-offer opportunities", () => {
    expect(
      isApplicationActionableForOffer({
        status: "open",
        currentLenderOfferState: "offer_declined",
        hasAcceptedOffer: false,
      }),
    ).toBe(true);
    expect(
      isApplicationActionableForOffer({
        status: "submitted",
        currentLenderOfferState: "offer_expired",
        hasAcceptedOffer: false,
      }),
    ).toBe(true);
  });

  it("blocks actionability when an offer is pending or any offer is accepted", () => {
    expect(
      isApplicationActionableForOffer({
        status: "open",
        currentLenderOfferState: "offer_pending",
        hasAcceptedOffer: false,
      }),
    ).toBe(false);
    expect(
      isApplicationActionableForOffer({
        status: "open",
        currentLenderOfferState: "not_offered",
        hasAcceptedOffer: true,
      }),
    ).toBe(false);
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
      interest_service_charge_rate: 7.5,
      repayment_amount: 22_000,
      fees: 500,
      due_date: "2026-07-24",
      remarks: "Offer is based on submitted portfolio cash flow.",
      sent_at: "2026-05-24T08:00:00.000Z",
      repayment_channel: "GCash",
      repayment_account_name: "Partner Capital",
      repayment_account_number: "09171234567",
      repayment_instructions: null,
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
          additional_roles: [],
          status: "active",
        },
        "borrower",
      ),
    ).toBe(true);
    expect(
      canAccessRole(
        {
          role: "borrower",
          additional_roles: [],
          status: "suspended",
        },
        "borrower",
      ),
    ).toBe(false);
  });

  it("keeps borrower access primary-role-only", () => {
    expect(
      hasPrimaryRole(
        {
          role: "borrower",
          status: "active",
        },
        "borrower",
      ),
    ).toBe(true);
    expect(
      hasPrimaryRole(
        {
          role: "lender",
          status: "active",
        },
        "borrower",
      ),
    ).toBe(false);
  });

  it("requires approved lender status before offer creation", () => {
    expect(
      isApprovedLender({
        role: "lender",
        additional_roles: [],
        status: "active",
        lenderProfile: {
          verification_status: "approved",
        },
      }),
    ).toBe(true);
    expect(
      isApprovedLender({
        role: "lender",
        additional_roles: [],
        status: "active",
        lenderProfile: {
          verification_status: "pending",
        },
      }),
    ).toBe(false);
    expect(
      isApprovedLender({
        role: "lender",
        additional_roles: [],
        status: "active",
        lenderProfile: {
          verification_status: "incomplete",
        },
      }),
    ).toBe(false);
    expect(
      isApprovedLender({
        role: "borrower",
        additional_roles: ["lender"],
        status: "active",
        lenderProfile: {
          verification_status: "approved",
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

  it("allows mobile HEIC repayment proof uploads", () => {
    const migration = readFileSync(
      "supabase/migrations/20260531023738_allow_heic_repayment_proofs.sql",
      "utf8",
    );
    const borrowerActions = readFileSync("app/borrower/actions.ts", "utf8");
    const borrowerPanel = readFileSync(
      "components/borrower-loan-application-panel.tsx",
      "utf8",
    );

    expect(migration).toContain("'image/heic'");
    expect(migration).toContain("'image/heif'");
    expect(migration).toContain("allowed_mime_types");
    expect(migration).toContain("repayment_proofs_file_type_check");
    expect(borrowerActions).toContain("\"image/heic\"");
    expect(borrowerActions).toContain("\"image/heif\"");
    expect(borrowerPanel).toContain("image/heic,image/heif");
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

  it("hardens lender offer range, availability, and onboarding audit state", () => {
    const migration = readFileSync(
      "supabase/migrations/20260531023059_harden_lender_offer_workflow.sql",
      "utf8",
    );

    expect(migration).toContain(
      "Approved amount is below your configured minimum loan amount.",
    );
    expect(migration).toContain(
      "Approved amount exceeds your configured maximum loan amount.",
    );
    expect(migration).toContain(
      "function app_private.get_lender_application_offer_flags",
    );
    expect(migration).toContain("has_accepted_offer");
    expect(migration).toContain("v_previous_status :=");
    expect(migration).toContain("'previous_status', v_previous_status");
  });
});

describe("borrower readiness gates", () => {
  const completePortfolio = {
    businessName: "Aling Nena Store",
    businessType: "sari_sari_store" as const,
    location: "Diliman, Quezon City, NCR - National Capital Region, 1100",
    address: {
      regionCode: "NCR",
      regionName: "NCR - National Capital Region",
      cityOrMunicipality: "Quezon City",
      barangay: "Diliman",
      zipCode: "1100",
    },
    streetAddress: "",
    monthlyGrossRevenue: 45_000,
    monthlyExpenses: 28_000,
    monthlyInventoryCost: 28_000,
    businessExpensesCompleted: true,
    existingLoanPayments: 3_500,
    hasExistingDebts: true,
    personalLoanPayments: 3_500,
    householdExpensesCompleted: true,
    existingDebtDeclarationCompleted: true,
    hasBusinessRegistration: true,
    businessRegistrationType: "barangay_permit" as const,
    registrationNumber: "BRGY-2026-001",
    registrationDate: "2026-01-15",
    revenueConfidence: "sales_records" as const,
    mainProductsOrServicesCategory: "groceries_household_items" as const,
    confirmsInformationTrue: true,
    consentsToDataProcessing: true,
    consentsToCreditCheck: true,
    confirmsBusinessOperating: true,
    yearsInOperation: 2,
    loanPurposeContext:
      "Additional working capital for inventory before the holiday season.",
  };

  it("blocks borrowers when verification is not approved", () => {
    const result = evaluateBorrowerReadiness(completePortfolio, {
      accountStatus: "active",
      borrowerVerification: {
        id: "v-1",
        status: "pending",
        managerReviewNotes: null,
        rejectionReason: null,
        submittedAt: null,
        reviewedAt: null,
        documents: [],
        documentPolicy: {
          requiredDocumentTypes: ["valid_id", "business_proof"],
          missingRequiredDocumentTypes: ["valid_id", "business_proof"],
          submittedDocumentTypes: [],
          acceptedDocumentTypes: [],
          rejectedDocumentTypes: [],
          readyForManagerReview: false,
          documentsAccepted: false,
        },
      },
      loanApplicationConsent: {
        scope: "borrower_loan_application",
        isCurrent: true,
        required: [],
        missing: [],
        accepted: [],
      },
    });

    expect(result.readinessStatus).not.toBe("eligible_to_apply");
  });

  it("blocks borrowers when loan application consent is missing", () => {
    const result = evaluateBorrowerReadiness(completePortfolio, {
      accountStatus: "active",
      borrowerVerification: {
        id: "v-1",
        status: "approved",
        managerReviewNotes: null,
        rejectionReason: null,
        submittedAt: null,
        reviewedAt: null,
        documents: [
          {
            id: "doc-1",
            borrowerVerificationId: "v-1",
            documentType: "business_proof",
            status: "accepted",
            fileName: "business-proof.pdf",
            fileType: "application/pdf",
            fileSize: 1000,
            uploadedAt: "2026-06-01T00:00:00Z",
            reviewedAt: null,
            reviewNotes: null,
            viewUrl: null,
          },
        ],
        documentPolicy: {
          requiredDocumentTypes: ["valid_id", "business_proof"],
          missingRequiredDocumentTypes: [],
          submittedDocumentTypes: ["valid_id", "business_proof"],
          acceptedDocumentTypes: ["valid_id", "business_proof"],
          rejectedDocumentTypes: [],
          readyForManagerReview: true,
          documentsAccepted: true,
        },
      },
      loanApplicationConsent: {
        scope: "borrower_loan_application",
        isCurrent: false,
        required: [],
        missing: [{ consentType: "credit_review_authorization", version: "v1" }],
        accepted: [],
      },
    });

    expect(result.readinessStatus).not.toBe("eligible_to_apply");
  });

  it("allows borrowers when verification is approved and consent is current", () => {
    const result = evaluateBorrowerReadiness(completePortfolio, {
      accountStatus: "active",
      borrowerVerification: {
        id: "v-1",
        status: "approved",
        managerReviewNotes: null,
        rejectionReason: null,
        submittedAt: null,
        reviewedAt: null,
        documents: [
          {
            id: "doc-1",
            borrowerVerificationId: "v-1",
            documentType: "business_proof",
            status: "accepted",
            fileName: "business-proof.pdf",
            fileType: "application/pdf",
            fileSize: 1000,
            uploadedAt: "2026-06-01T00:00:00Z",
            reviewedAt: null,
            reviewNotes: null,
            viewUrl: null,
          },
        ],
        documentPolicy: {
          requiredDocumentTypes: ["valid_id", "business_proof"],
          missingRequiredDocumentTypes: [],
          submittedDocumentTypes: ["valid_id", "business_proof"],
          acceptedDocumentTypes: ["valid_id", "business_proof"],
          rejectedDocumentTypes: [],
          readyForManagerReview: true,
          documentsAccepted: true,
        },
      },
      loanApplicationConsent: {
        scope: "borrower_loan_application",
        isCurrent: true,
        required: [],
        missing: [],
        accepted: [],
      },
    });

    expect(result.readinessStatus).toBe("eligible_to_apply");
  });
});

describe("borrower verification eligibility", () => {
  it("requires approved status and accepted documents for loan application", () => {
    const approved: BorrowerVerificationSummary = {
      id: "v-1",
      status: "approved",
      managerReviewNotes: null,
      rejectionReason: null,
      submittedAt: null,
      reviewedAt: null,
      documents: [],
      documentPolicy: {
        requiredDocumentTypes: ["valid_id", "business_proof"],
        missingRequiredDocumentTypes: [],
        submittedDocumentTypes: ["valid_id", "business_proof"],
        acceptedDocumentTypes: ["valid_id", "business_proof"],
        rejectedDocumentTypes: [],
        readyForManagerReview: true,
        documentsAccepted: true,
      },
    };
    expect(canSubmitLoanApplicationForVerification(approved)).toBe(true);
  });

  it("blocks loan application when verification is pending", () => {
    const pending: BorrowerVerificationSummary = {
      id: "v-1",
      status: "pending",
      managerReviewNotes: null,
      rejectionReason: null,
      submittedAt: null,
      reviewedAt: null,
      documents: [],
      documentPolicy: {
        requiredDocumentTypes: ["valid_id", "business_proof"],
        missingRequiredDocumentTypes: ["valid_id", "business_proof"],
        submittedDocumentTypes: [],
        acceptedDocumentTypes: [],
        rejectedDocumentTypes: [],
        readyForManagerReview: false,
        documentsAccepted: false,
      },
    };
    expect(canSubmitLoanApplicationForVerification(pending)).toBe(false);
  });

  it("blocks loan application when documents are not accepted", () => {
    const approvedNoDocs: BorrowerVerificationSummary = {
      id: "v-1",
      status: "approved",
      managerReviewNotes: null,
      rejectionReason: null,
      submittedAt: null,
      reviewedAt: null,
      documents: [],
      documentPolicy: {
        requiredDocumentTypes: ["valid_id", "business_proof"],
        missingRequiredDocumentTypes: ["business_proof"],
        submittedDocumentTypes: ["valid_id"],
        acceptedDocumentTypes: ["valid_id"],
        rejectedDocumentTypes: [],
        readyForManagerReview: true,
        documentsAccepted: false,
      },
    };
    expect(canSubmitLoanApplicationForVerification(approvedNoDocs)).toBe(false);
  });

  it("blocks loan application when verification is null", () => {
    expect(canSubmitLoanApplicationForVerification(null)).toBe(false);
  });
});

describe("role-based routing", () => {
  it("routes borrowers to /borrower", () => {
    expect(getRouteForRole("borrower")).toBe("/borrower");
  });

  it("routes lenders to /lender", () => {
    expect(getRouteForRole("lender")).toBe("/lender");
  });

  it("routes managers to /manager", () => {
    expect(getRouteForRole("manager")).toBe("/manager");
  });
});

describe("consent status building", () => {
  it("marks loan application consent as not current when missing credit review", () => {
    const status = buildConsentStatus("borrower_loan_application", []);
    expect(status.isCurrent).toBe(false);
    expect(status.missing.length).toBeGreaterThan(0);
  });

  it("marks loan application consent as current when all required consents present", () => {
    const consents: UserConsentRecord[] = [
      {
        consentType: "terms_of_service",
        version: CURRENT_CONSENT_VERSIONS.terms_of_service,
        acceptedAt: "2026-05-01T00:00:00Z",
      },
      {
        consentType: "privacy_notice",
        version: CURRENT_CONSENT_VERSIONS.privacy_notice,
        acceptedAt: "2026-05-01T00:00:00Z",
      },
      {
        consentType: "credit_review_authorization",
        version: CURRENT_CONSENT_VERSIONS.credit_review_authorization,
        acceptedAt: "2026-05-01T00:00:00Z",
      },
    ];
    const status = buildConsentStatus("borrower_loan_application", consents);
    expect(status.isCurrent).toBe(true);
    expect(status.missing.length).toBe(0);
  });
});

describe("lender profile hub", () => {
  it("imports LenderProfileHub from lender account tab", () => {
    const lenderAccountTab = readFileSync(
      "components/lender/profile/lender-account-tab.tsx",
      "utf8",
    );

    expect(lenderAccountTab).toContain("LenderProfileHub");
    expect(lenderAccountTab).toContain("LenderProfileView");
  });

  it("replaces old inline AccountTab with LenderAccountTab in lender page", () => {
    const lenderPage = readFileSync("app/lender/page.tsx", "utf8");

    expect(lenderPage).toContain("LenderAccountTab");
    expect(lenderPage).toContain("lenderProfile={access.profile.lenderProfile}");
    expect(lenderPage).not.toContain("function AccountTab(");
  });

  it("contains all lender profile menu labels", () => {
    const lenderProfileHub = readFileSync(
      "components/lender/profile/lender-profile-hub.tsx",
      "utf8",
    );

    expect(lenderProfileHub).toContain('"Organization Profile"');
    expect(lenderProfileHub).toContain('"Lending Details"');
    expect(lenderProfileHub).toContain('"Verification"');
    expect(lenderProfileHub).toContain('"Account & Security"');
    expect(lenderProfileHub).toContain('"Help & Support"');
  });

  it("contains all lender profile subview state names", () => {
    const lenderProfileHub = readFileSync(
      "components/lender/profile/lender-profile-hub.tsx",
      "utf8",
    );

    expect(lenderProfileHub).toContain('"organization"');
    expect(lenderProfileHub).toContain('"lending"');
    expect(lenderProfileHub).toContain('"verification"');
    expect(lenderProfileHub).toContain('"account"');
    expect(lenderProfileHub).toContain('"support"');
  });

  it("renders lender account section with email", () => {
    const lenderAccountSection = readFileSync(
      "components/lender/profile/lender-account-section.tsx",
      "utf8",
    );

    expect(lenderAccountSection).toContain("LenderAccountSection");
    expect(lenderAccountSection).toContain("Account");
  });

  it("leaves borrower profile implementation untouched", () => {
    const borrowerProfileHub = readFileSync(
      "components/borrower/profile/borrower-profile-hub.tsx",
      "utf8",
    );

    expect(borrowerProfileHub).toContain("BorrowerProfileHub");
    expect(borrowerProfileHub).toContain("Business Profile");
    expect(borrowerProfileHub).toContain("Borrowing Power");
    expect(borrowerProfileHub).toContain("Help & Support");
  });
});

describe("manager lender review page", () => {
  it("uses loadManagerLenders for the lender list page", () => {
    const lendersPage = readFileSync(
      "app/manager/lenders/page.tsx",
      "utf8",
    );

    expect(lendersPage).toContain("loadManagerLenders");
  });

  it("renders filter form for filtering lenders", () => {
    const lendersPage = readFileSync(
      "app/manager/lenders/page.tsx",
      "utf8",
    );

    expect(lendersPage).toContain("FilterForm");
    expect(lendersPage).toContain("SelectFilter");
    expect(lendersPage).toContain("TextFilter");
    expect(lendersPage).toContain("LenderFilters");
    expect(lendersPage).toContain('"Pending"');
    expect(lendersPage).toContain('"Incomplete"');
    expect(lendersPage).toContain('"Approved"');
    expect(lendersPage).toContain('"Rejected"');
  });

  it("uses a unified queue table with status and readiness columns", () => {
    const lendersPage = readFileSync(
      "app/manager/lenders/page.tsx",
      "utf8",
    );

    expect(lendersPage).toContain("LenderQueueTable");
    expect(lendersPage).toContain("LenderQueueRow");
    expect(lendersPage).toContain("LenderQueueMobileCard");
    expect(lendersPage).toContain("buildQueueHref");
    expect(lendersPage).not.toContain("completedLenders");
  });

  it("gates approval when disclosures are missing", () => {
    const lendersPage = readFileSync(
      "app/manager/lenders/page.tsx",
      "utf8",
    );
    const decisionForm = readFileSync(
      "app/manager/lenders/lender-decision-form.tsx",
      "utf8",
    );

    expect(lendersPage).toContain("consentStatus.isCurrent");
    expect(decisionForm).toContain("disclosuresCurrent");
    expect(decisionForm).toContain("isBlocked");
  });

  it("hides approval button when disclosures are missing", () => {
    const decisionForm = readFileSync(
      "app/manager/lenders/lender-decision-form.tsx",
      "utf8",
    );

    expect(decisionForm).toContain("disclosuresCurrent");
    expect(decisionForm).toContain("managerReviewNotes");
    expect(decisionForm).toContain("ShieldAlertIcon");
  });

  it("summarizes missing fields instead of repeating Not provided", () => {
    const lendersPage = readFileSync(
      "app/manager/lenders/page.tsx",
      "utf8",
    );

    expect(lendersPage).toContain("getMissingProfileFields");
    expect(lendersPage).toContain("Missing: {missingFields.join");
    expect(lendersPage).toContain("missingFields.join");
  });

  it("renders missing org name as Not provided", () => {
    const lendersPage = readFileSync(
      "app/manager/lenders/page.tsx",
      "utf8",
    );

    // Org name fallback is used in queue rows and selected detail
    expect(lendersPage).toContain('"Not provided"');
    expect(lendersPage).toContain("getDisclosureProgress");
  });

  it("shows a compact disclosure summary with missing item names", () => {
    const lendersPage = readFileSync(
      "app/manager/lenders/page.tsx",
      "utf8",
    );

    expect(lendersPage).toContain("DisclosureSection");
    expect(lendersPage).toContain("getDisclosureProgress");
    expect(lendersPage).toContain("consentTypeLabels");
  });

  it("renders disclosure status on pending lender cards", () => {
    const lendersPage = readFileSync(
      "app/manager/lenders/page.tsx",
      "utf8",
    );

    expect(lendersPage).toContain("getDisclosureProgress");
    expect(lendersPage).toContain("consentStatus.isCurrent");
  });

  it("keeps lender disclosure acceptance visible in approval progress", () => {
    const pendingPanel = readFileSync(
      "components/lender/lender-pending-review-panel.tsx",
      "utf8",
    );

    expect(pendingPanel).toContain("acceptedInSession");
    expect(pendingPanel).toContain("onConsentAccepted={() => setAcceptedInSession(true)}");
    expect(pendingPanel).toContain("Required disclosures accepted");
    expect(pendingPanel).toContain("You have already approved the lender disclosures.");
    expect(pendingPanel).toContain("documentPolicy.readyForManagerReview");
  });

  it("keeps review action wiring intact", () => {
    const lendersPage = readFileSync(
      "app/manager/lenders/page.tsx",
      "utf8",
    );
    const decisionForm = readFileSync(
      "app/manager/lenders/lender-decision-form.tsx",
      "utf8",
    );

    expect(lendersPage).toContain("LenderDecisionForm");
    expect(decisionForm).toContain("reviewLenderAction");
    expect(decisionForm).toContain('name="lenderProfileId"');
    expect(decisionForm).toContain('name="decision"');
  });

  it("does not render incomplete lenders as reviewed or rejected", () => {
    const lendersPage = readFileSync(
      "app/manager/lenders/page.tsx",
      "utf8",
    );

    expect(lendersPage).toContain("incompleteCount");
    expect(lendersPage).toContain(
      'l.verificationStatus === "incomplete"',
    );
    expect(lendersPage).toContain(
      'l.verificationStatus === "approved"',
    );
    expect(lendersPage).toContain(
      'l.verificationStatus === "rejected"',
    );
    expect(lendersPage).not.toContain("completedLenders");
  });

  it("uses queue table and mobile card layout for lender rows", () => {
    const lendersPage = readFileSync(
      "app/manager/lenders/page.tsx",
      "utf8",
    );

    expect(lendersPage).toContain("LenderQueueTable");
    expect(lendersPage).toContain('Card size="sm"');
    expect(lendersPage).toContain("Table");
    expect(lendersPage).toContain("TableHeader");
    expect(lendersPage).toContain("TableBody");
  });

  it("shows compact blocker message instead of large alert box on pending cards", () => {
    const decisionForm = readFileSync(
      "app/manager/lenders/lender-decision-form.tsx",
      "utf8",
    );

    expect(decisionForm).toContain("isBlocked");
    expect(decisionForm).toContain("ShieldAlertIcon");
  });

  it("keeps review links available on lender queue", () => {
    const lendersPage = readFileSync(
      "app/manager/lenders/page.tsx",
      "utf8",
    );

    expect(lendersPage).toContain("buildQueueHref");
  });

  it("allows multiple borrower applications through credit-line migration safeguards", () => {
    const migration = readFileSync(
      "supabase/migrations/20260618123000_allow_open_applications_with_available_credit.sql",
      "utf8",
    );

    expect(migration).toContain(
      "calculate_borrower_credit_limit_details_for_application",
    );
    expect(migration).toContain(
      "perform pg_advisory_xact_lock(hashtext(v_actor_id::text));",
    );
    expect(migration).toContain("'code', 'credit_limit_exceeded'");
    expect(migration).not.toContain("'code', 'active_application'");
    expect(migration).not.toContain("You already have an open application");
  });

  it("uses the current borrower credit snapshot for application validation", () => {
    const migration = readFileSync(
      "supabase/migrations/20260618174000_use_current_credit_snapshot_for_applications.sql",
      "utf8",
    );

    expect(migration).toContain(
      "create or replace function app_private.get_borrower_credit_snapshot",
    );
    expect(migration).toContain(
      "create or replace function app_private.enforce_loan_application_credit_limit",
    );
    expect(migration).toContain(
      "v_credit := app_private.get_borrower_credit_snapshot(v_actor_id, null);",
    );
    expect(migration).toContain(
      "v_credit := app_private.get_borrower_credit_snapshot(new.borrower_id, new.id);",
    );
    expect(migration).toContain("and status in ('active', 'overdue')");
    expect(migration).toContain("sum(principal_amount)");
    expect(migration).toContain(
      "Unable to verify your latest credit limit. Please refresh and try again.",
    );
    expect(migration).not.toContain("credit_limit_at_submission >");
  });
});
