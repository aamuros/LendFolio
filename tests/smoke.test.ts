import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { borrowerPortfolioSchema } from "../lib/borrower-portfolio";
import {
  calculateBorrowerAvailableCredit,
  calculateBorrowerCreditLimit,
} from "../lib/credit-limit";
import {
  loanApplicationSchema,
  mapLoanApplicationRow,
} from "../lib/loan-application";
import {
  createLoanOfferSchema,
  loanOfferSchema,
  mapLoanOfferRow,
} from "../lib/loan-offer";
import {
  createMetadataPreview,
  createScheduleSummary,
  getShortId,
} from "../lib/manager-operations";
import { parseMoneyInput } from "../lib/money-input";
import { signupSchema } from "../lib/signup";
import {
  countUnreadNotifications,
  formatNotificationDate,
  mapNotificationRow,
  normalizeNotificationHref,
} from "../lib/notifications";
import { canAccessRole, isApprovedLender } from "../lib/role-rules";
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

  it("maps credit snapshot fields from application rows", () => {
    expect(
      mapLoanApplicationRow({
        id: "application-1",
        borrower_id: "borrower-1",
        borrower_portfolio_id: "portfolio-1",
        requested_amount: 25000,
        credit_limit_at_submission: 54300,
        used_credit_at_submission: 23800,
        available_credit_at_submission: 30500,
        purpose: "Inventory restock",
        preferred_term: "3_months",
        remarks: null,
        status: "submitted",
        submitted_at: "2026-05-25T00:00:00.000Z",
        created_at: "2026-05-25T00:00:00.000Z",
        updated_at: "2026-05-25T00:00:00.000Z",
      }),
    ).toMatchObject({
      creditLimitAtSubmission: 54300,
      usedCreditAtSubmission: 23800,
      availableCreditAtSubmission: 30500,
    });
  });
});

describe("borrower credit limit", () => {
  it("returns 0 for negative net cash flow", () => {
    expect(
      calculateBorrowerCreditLimit({
        monthlyGrossRevenue: 20_000,
        monthlyExpenses: 25_000,
        existingLoanPayments: 2_000,
        yearsInOperation: 3,
      }),
    ).toBe(0);
  });

  it("applies years-in-operation multiplier boundaries", () => {
    const basePortfolio = {
      monthlyGrossRevenue: 100_000,
      monthlyExpenses: 80_000,
      existingLoanPayments: 0,
    };

    expect(
      calculateBorrowerCreditLimit({ ...basePortfolio, yearsInOperation: 0.9 }),
    ).toBe(45_000);
    expect(
      calculateBorrowerCreditLimit({ ...basePortfolio, yearsInOperation: 1 }),
    ).toBe(60_000);
    expect(
      calculateBorrowerCreditLimit({ ...basePortfolio, yearsInOperation: 2.9 }),
    ).toBe(60_000);
    expect(
      calculateBorrowerCreditLimit({ ...basePortfolio, yearsInOperation: 3 }),
    ).toBe(75_000);
  });

  it("caps the limit at twice monthly gross revenue", () => {
    expect(
      calculateBorrowerCreditLimit({
        monthlyGrossRevenue: 50_000,
        monthlyExpenses: 1_000,
        existingLoanPayments: 0,
        yearsInOperation: 3,
      }),
    ).toBe(100_000);
  });

  it("caps the limit at PHP 1,000,000", () => {
    expect(
      calculateBorrowerCreditLimit({
        monthlyGrossRevenue: 900_000,
        monthlyExpenses: 0,
        existingLoanPayments: 0,
        yearsInOperation: 3,
      }),
    ).toBe(1_000_000);
  });

  it("reduces available credit by outstanding unpaid loan balances", () => {
    expect(
      calculateBorrowerAvailableCredit({
        portfolio: {
          monthlyGrossRevenue: 100_000,
          monthlyExpenses: 80_000,
          existingLoanPayments: 0,
          yearsInOperation: 3,
        },
        activeLoans: [
          { status: "active", outstandingBalance: 10_000 },
          { status: "overdue", outstandingBalance: 5_500 },
          { status: "defaulted", outstandingBalance: 3_000 },
          { status: "paid", outstandingBalance: 9_000 },
          { status: "closed", outstandingBalance: 8_000 },
        ],
      }).availableCredit,
    ).toBe(39_500);
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
      lateCount: 0,
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
});

describe("overdue repayment migration", () => {
  const migration = readFileSync(
    "supabase/migrations/20260525083512_add_overdue_repayment_refresh.sql",
    "utf8",
  );

  it("defines the manager refresh RPC and guard", () => {
    expect(migration).toContain("refresh_overdue_repayment_statuses");
    expect(migration).toContain("app_private.is_manager(v_actor_id)");
    expect(migration).toContain("security invoker");
  });

  it("contains the required overdue lifecycle transitions", () => {
    expect(migration).toContain("status = 'late'");
    expect(migration).toContain("status in ('due', 'rejected')");
    expect(migration).toContain("status = 'overdue'");
    expect(migration).toContain("status = 'active'");
    expect(migration).toContain("outstanding_balance > 0");
  });
});

describe("notifications migration", () => {
  const migration = readFileSync(
    "supabase/migrations/20260525090048_add_notifications_foundation.sql",
    "utf8",
  );

  it("creates the notifications table, indexes, and RLS policies", () => {
    expect(migration).toContain("create table if not exists public.notifications");
    expect(migration).toContain(
      "alter table public.notifications enable row level security",
    );
    expect(migration).toContain("notifications_user_select_own");
    expect(migration).toContain("notifications_user_update_own");
    expect(migration).toContain("notifications_manager_select_all");
    expect(migration).toContain("notifications_user_created_idx");
    expect(migration).toContain("notifications_user_unread_idx");
  });

  it("keeps notification creation private", () => {
    expect(migration).toContain("function app_private.create_notification");
    expect(migration).toContain(
      "revoke insert, update, delete on public.notifications from authenticated",
    );
    expect(migration).toContain(
      "grant update (read_at) on public.notifications to authenticated",
    );
  });
});

describe("workflow notifications migration", () => {
  const migration = readFileSync(
    "supabase/migrations/20260525091146_wire_workflow_notifications.sql",
    "utf8",
  );

  it("wires the expected workflow notification event types", () => {
    expect(migration).toContain("offer_received");
    expect(migration).toContain("offer_accepted");
    expect(migration).toContain("offer_declined");
    expect(migration).toContain("repayment_proof_submitted");
    expect(migration).toContain("repayment_verified");
    expect(migration).toContain("repayment_rejected");
    expect(migration).toContain("repayment_late");
    expect(migration).toContain("loan_overdue");
  });

  it("uses private notification creation without opening client inserts", () => {
    expect(migration).toContain("app_private.create_notification");
    expect(migration).toContain("app_private.try_create_notification");
    expect(migration).not.toContain(
      "grant insert on public.notifications to authenticated",
    );
  });
});

describe("notification UI helpers", () => {
  it("maps notification rows for display", () => {
    const notification = mapNotificationRow({
      id: "99999999-9999-4999-8999-999999999999",
      user_id: "11111111-1111-1111-1111-111111111111",
      type: "offer_received",
      title: "New offer received",
      message: "A lender sent an offer for your application.",
      href: "/borrower",
      read_at: null,
      created_at: "2026-05-25T09:15:00.000Z",
    });

    expect(notification).toMatchObject({
      id: "99999999-9999-4999-8999-999999999999",
      title: "New offer received",
      href: "/borrower",
      readAt: null,
      isUnread: true,
    });
  });

  it("counts unread notifications and keeps hrefs internal", () => {
    expect(
      countUnreadNotifications([
        { readAt: null },
        { readAt: "2026-05-25T09:20:00.000Z" },
        { readAt: null },
      ]),
    ).toBe(2);
    expect(normalizeNotificationHref("/lender?tab=offers")).toBe(
      "/lender?tab=offers",
    );
    expect(normalizeNotificationHref("https://example.com")).toBeNull();
  });

  it("formats today's notifications as time and older notifications as dates", () => {
    const now = new Date("2026-05-25T12:00:00");

    expect(formatNotificationDate("2026-05-25T09:15:00", now)).toContain(
      "9:15",
    );
    expect(formatNotificationDate("2026-05-20T09:15:00", now)).toContain(
      "May",
    );
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

  it("rejects approved amount above requested amount", () => {
    const result = createLoanOfferSchema(25_000).safeParse({
      approvedAmount: 25_001,
      repaymentAmount: 26_000,
      fees: 0,
      dueDate: "2026-07-24",
      remarks: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.approvedAmount).toContain(
        "Approved amount cannot exceed the requested amount.",
      );
    }
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

describe("signup validation", () => {
  const completeLenderSignup = {
    role: "lender",
    displayName: "Juan Reyes",
    organizationName: "Community Capital",
    contactPerson: "Juan Reyes",
    phoneNumber: "+63 917 555 0100",
    businessAddress: "12 Market Street, Quezon City",
    operatingArea: "Metro Manila",
    businessRegistrationNumber: "BRN-12345",
    minLoanAmount: "5000",
    maxLoanAmount: "50000",
    typicalRepaymentTerms: "1 to 6 months",
    lenderDescription:
      "Community lender supporting micro-retail businesses with working capital.",
    email: "lender@example.com",
    password: "LendFolio123!",
    confirmPassword: "LendFolio123!",
  };

  it("accepts borrower signup input without an organization", () => {
    expect(
      signupSchema.safeParse({
        role: "borrower",
        displayName: "Maria Santos",
        email: "MARIA@example.com",
        password: "LendFolio123!",
        confirmPassword: "LendFolio123!",
      }).success,
    ).toBe(true);

    expect(
      signupSchema.safeParse({
        role: "borrower",
        displayName: "Maria Santos",
        organizationName: null,
        email: "maria@example.com",
        password: "LendFolio123!",
        confirmPassword: "LendFolio123!",
      }).success,
    ).toBe(true);

    expect(
      signupSchema.safeParse({
        role: "borrower",
        displayName: "Maria Santos",
        organizationName: "",
        contactPerson: "",
        phoneNumber: "",
        businessAddress: "",
        operatingArea: "",
        minLoanAmount: "",
        maxLoanAmount: "",
        typicalRepaymentTerms: "",
        lenderDescription: "",
        email: "borrower@example.com",
        password: "LendFolio123!",
        confirmPassword: "LendFolio123!",
      }).success,
    ).toBe(true);
  });

  it("accepts lender signup input with a valid organization", () => {
    expect(
      signupSchema.safeParse(completeLenderSignup).success,
    ).toBe(true);
  });

  it("rejects lender signup without required review fields", () => {
    expect(
      signupSchema.safeParse({
        role: "lender",
        displayName: "Juan Reyes",
        organizationName: "Community Capital",
        email: "lender@example.com",
        password: "LendFolio123!",
        confirmPassword: "LendFolio123!",
      }).success,
    ).toBe(false);
  });

  it("rejects lender signup when the maximum loan amount is below the minimum", () => {
    expect(
      signupSchema.safeParse({
        ...completeLenderSignup,
        minLoanAmount: "50000",
        maxLoanAmount: "5000",
      }).success,
    ).toBe(false);
  });

  it("rejects manager signup", () => {
    expect(
      signupSchema.safeParse({
        role: "manager",
        displayName: "Platform Manager",
        organizationName: "",
        email: "manager@example.com",
        password: "LendFolio123!",
        confirmPassword: "LendFolio123!",
      }).success,
    ).toBe(false);
  });

  it("rejects lender signup without an organization", () => {
    expect(
      signupSchema.safeParse({
        ...completeLenderSignup,
        organizationName: undefined,
      }).success,
    ).toBe(false);

    expect(
      signupSchema.safeParse({
        ...completeLenderSignup,
        organizationName: null,
      }).success,
    ).toBe(false);

    expect(
      signupSchema.safeParse({
        ...completeLenderSignup,
        organizationName: "",
      }).success,
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

  it("stores credit snapshots and validates offers against requested amount", () => {
    const migration = readFileSync(
      "supabase/migrations/20260525080000_add_application_credit_snapshot_offer_validation.sql",
      "utf8",
    );

    expect(migration).toContain("credit_limit_at_submission numeric(12, 2)");
    expect(migration).toContain("used_credit_at_submission numeric(12, 2)");
    expect(migration).toContain("available_credit_at_submission numeric(12, 2)");
    expect(migration).toContain(
      "Approved amount cannot exceed the requested amount.",
    );
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

  it("defines account signup provisioning and manager lender review safeguards", () => {
    const migration = readFileSync(
      "supabase/migrations/20260525110149_add_account_onboarding.sql",
      "utf8",
    );
    const profileDepthMigration = readFileSync(
      "supabase/migrations/20260525115311_lender_verification_profile_depth.sql",
      "utf8",
    );

    expect(migration).toContain("provision_new_auth_user");
    expect(migration).toContain("v_role not in ('borrower', 'lender')");
    expect(profileDepthMigration).toContain("contact_person");
    expect(profileDepthMigration).toContain("Rejection reason is required.");
    expect(profileDepthMigration).toContain("manager_review_notes");
    expect(migration).toContain("verification_status = 'approved'");
    expect(migration).toContain("verification_status = 'rejected'");
    expect(migration).toContain("lender_approved");
    expect(migration).toContain("lender_rejected");
    expect(migration).toContain("revoke insert, update, delete on public.profiles");
    expect(migration).toContain(
      "revoke insert, update, delete on public.lender_profiles",
    );
  });
});
