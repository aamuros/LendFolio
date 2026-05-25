import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { borrowerPortfolioSchema } from "../lib/borrower-portfolio";
import { loanApplicationSchema } from "../lib/loan-application";
import { loanOfferSchema, mapLoanOfferRow } from "../lib/loan-offer";
import { parseMoneyInput } from "../lib/money-input";
import { canAccessRole, isApprovedLender } from "../lib/role-rules";
import {
  applyAcceptedOfferInvariant,
  canAcceptOffer,
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
