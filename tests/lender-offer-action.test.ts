import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLoanOffer } from "../app/lender/applications/[id]/actions";
import { requireApprovedLender } from "@/lib/access-control";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/access-control", () => ({
  requireApprovedLender: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockedRequireApprovedLender = vi.mocked(requireApprovedLender);
const mockedRevalidatePath = vi.mocked(revalidatePath);

type MockSupabase = {
  rpc: ReturnType<typeof vi.fn>;
  from: ReturnType<typeof vi.fn>;
};

function asSupabase(mockSupabase: MockSupabase) {
  return mockSupabase as unknown as NonNullable<
    Awaited<ReturnType<typeof requireApprovedLender>>["supabase"]
  >;
}

function createMockFromChain(data: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  };
}

function createValidOfferFormData() {
  const formData = new FormData();

  formData.set("requestedAmount", "25000");
  formData.set("approvedAmount", "20000");
  formData.set("interestServiceChargeRate", "7.5");
  formData.set("fees", "500");
  formData.set("dueDate", "2099-01-01");
  formData.set("remarks", "Offer based on submitted cash flow.");
  formData.set("repaymentChannel", "GCash");
  formData.set("repaymentAccountName", "Approved Lending");
  formData.set("repaymentAccountNumber", "09171234567");
  formData.set("repaymentInstructions", "");

  return formData;
}

describe("createLoanOffer", () => {
  const previousState = {
    ok: false,
    message: "",
  } as const;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks unauthenticated access before invoking the RPC", async () => {
    const rpc = vi.fn();

    mockedRequireApprovedLender.mockResolvedValue({
      ok: false,
      reason: "unauthenticated",
      message: "Sign in to continue.",
      supabase: null,
    });

    const result = await createLoanOffer(
      "application-1",
      previousState,
      createValidOfferFormData(),
    );

    expect(result).toEqual({
      ok: false,
      message: "Sign in to continue.",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("blocks pending lenders before invoking the RPC", async () => {
    const mockSupabase = {
      rpc: vi.fn(),
      from: vi.fn(),
    };

    mockedRequireApprovedLender.mockResolvedValue({
      ok: false,
      reason: "forbidden",
      message:
        "Your lender profile is under review. Upload the required verification documents so a manager can complete approval.",
      supabase: asSupabase(mockSupabase),
    });

    const result = await createLoanOffer(
      "application-1",
      previousState,
      createValidOfferFormData(),
    );

    expect(result).toEqual({
      ok: false,
      message:
        "Your lender profile is under review. Upload the required verification documents so a manager can complete approval.",
    });
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  it("blocks rejected lenders before invoking the RPC", async () => {
    const mockSupabase = {
      rpc: vi.fn(),
      from: vi.fn(),
    };

    mockedRequireApprovedLender.mockResolvedValue({
      ok: false,
      reason: "forbidden",
      message: "Your lender access was not approved.",
      supabase: asSupabase(mockSupabase),
    });

    const result = await createLoanOffer(
      "application-1",
      previousState,
      createValidOfferFormData(),
    );

    expect(result).toEqual({
      ok: false,
      message: "Your lender access was not approved.",
    });
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  it("lets approved lenders validate and create offers", async () => {
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          ok: true,
          message: "Offer sent.",
          loan_application_id: "application-1",
        },
        error: null,
      }),
      from: vi.fn().mockReturnValue(
        createMockFromChain({
          requested_amount: 25000,
          available_credit_at_submission: 50000,
        }),
      ),
    };

    mockedRequireApprovedLender.mockResolvedValue({
      ok: true,
      supabase: asSupabase(mockSupabase),
      profile: {
        id: "lender-1",
        role: "lender",
        additional_roles: [],
        display_name: "Approved Lender",
        status: "active",
        created_at: "2026-05-26T00:00:00.000Z",
        updated_at: "2026-05-26T00:00:00.000Z",
        lenderProfile: {
          id: "lender-profile-1",
          user_id: "lender-1",
          organization_name: "Approved Lending",
          contact_person: "Approved Contact",
          phone_number: "+63 917 555 0199",
          business_address: "Quezon City",
          operating_area: "Metro Manila",
          business_registration_number: "DTI-12345",
          min_loan_amount: 5000,
          max_loan_amount: 50000,
          typical_repayment_terms: "1 to 6 months",
          lender_description: "Approved lender.",
          verification_status: "approved",
          approved_at: "2026-05-26T00:00:00.000Z",
          approved_by: "manager-1",
          manager_review_notes: null,
          rejection_reason: null,
          rejected_at: null,
          rejected_by: null,
          address_region: null,
          address_city_or_municipality: null,
          address_barangay: null,
          address_zip_code: null,
          created_at: "2026-05-26T00:00:00.000Z",
          updated_at: "2026-05-26T00:00:00.000Z",
        },
      },
    });

    const result = await createLoanOffer(
      "application-1",
      previousState,
      createValidOfferFormData(),
    );

    expect(result).toEqual({
      ok: true,
      message: "Offer sent.",
    });
    expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
    expect(mockSupabase.rpc).toHaveBeenCalledWith("create_loan_offer", {
      p_loan_application_id: "application-1",
      p_approved_amount: 20000,
      p_repayment_amount: 22400,
      p_interest_service_charge_rate: 7.5,
      p_fees: 500,
      p_processing_fee_rate: 0.02,
      p_processing_fee_amount: 400,
      p_due_date: "2099-01-01",
      p_remarks: "Offer based on submitted cash flow.",
      p_repayment_channel: "GCash",
      p_repayment_account_name: "Approved Lending",
      p_repayment_account_number: "09171234567",
      p_repayment_instructions: null,
    });
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/lender/applications/application-1",
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/borrower");
  });

  it("does not trust a tampered requestedAmount field for action validation", async () => {
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          ok: true,
          message: "Offer sent.",
          loan_application_id: "application-1",
        },
        error: null,
      }),
      from: vi.fn().mockReturnValue(
        createMockFromChain({
          requested_amount: 25000,
          available_credit_at_submission: 50000,
        }),
      ),
    };

    mockedRequireApprovedLender.mockResolvedValue({
      ok: true,
      supabase: asSupabase(mockSupabase),
      profile: {
        id: "lender-1",
        role: "lender",
        additional_roles: [],
        display_name: "Approved Lender",
        status: "active",
        created_at: "2026-05-26T00:00:00.000Z",
        updated_at: "2026-05-26T00:00:00.000Z",
        lenderProfile: {
          id: "lender-profile-1",
          user_id: "lender-1",
          organization_name: "Approved Lending",
          contact_person: "Approved Contact",
          phone_number: "+63 917 555 0199",
          business_address: "Quezon City",
          operating_area: "Metro Manila",
          business_registration_number: "DTI-12345",
          min_loan_amount: 5000,
          max_loan_amount: 50000,
          typical_repayment_terms: "1 to 6 months",
          lender_description: "Approved lender.",
          verification_status: "approved",
          approved_at: "2026-05-26T00:00:00.000Z",
          approved_by: "manager-1",
          manager_review_notes: null,
          rejection_reason: null,
          rejected_at: null,
          rejected_by: null,
          address_region: null,
          address_city_or_municipality: null,
          address_barangay: null,
          address_zip_code: null,
          created_at: "2026-05-26T00:00:00.000Z",
          updated_at: "2026-05-26T00:00:00.000Z",
        },
      },
    });

    const formData = createValidOfferFormData();
    formData.set("requestedAmount", "1000");
    formData.set("approvedAmount", "20000");

    const result = await createLoanOffer(
      "application-1",
      previousState,
      formData,
    );

    expect(result).toEqual({
      ok: true,
      message: "Offer sent.",
    });
    expect(mockSupabase.rpc).toHaveBeenCalledWith("create_loan_offer", {
      p_loan_application_id: "application-1",
      p_approved_amount: 20000,
      p_repayment_amount: 22400,
      p_interest_service_charge_rate: 7.5,
      p_fees: 500,
      p_processing_fee_rate: 0.02,
      p_processing_fee_amount: 400,
      p_due_date: "2099-01-01",
      p_remarks: "Offer based on submitted cash flow.",
      p_repayment_channel: "GCash",
      p_repayment_account_name: "Approved Lending",
      p_repayment_account_number: "09171234567",
      p_repayment_instructions: null,
    });
  });

  it("allows offer when total repayment exceeds available credit but principal fits", async () => {
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          ok: true,
          message: "Offer sent.",
          loan_application_id: "application-1",
        },
        error: null,
      }),
      from: vi.fn().mockReturnValue(
        createMockFromChain({
          requested_amount: 7000,
          available_credit_at_submission: 7000,
        }),
      ),
    };

    mockedRequireApprovedLender.mockResolvedValue({
      ok: true,
      supabase: asSupabase(mockSupabase),
      profile: {
        id: "lender-1",
        role: "lender",
        additional_roles: [],
        display_name: "Approved Lender",
        status: "active",
        created_at: "2026-05-26T00:00:00.000Z",
        updated_at: "2026-05-26T00:00:00.000Z",
        lenderProfile: {
          id: "lender-profile-1",
          user_id: "lender-1",
          organization_name: "Approved Lending",
          contact_person: "Approved Contact",
          phone_number: "+63 917 555 0199",
          business_address: "Quezon City",
          operating_area: "Metro Manila",
          business_registration_number: "DTI-12345",
          min_loan_amount: 5000,
          max_loan_amount: 50000,
          typical_repayment_terms: "1 to 6 months",
          lender_description: "Approved lender.",
          verification_status: "approved",
          approved_at: "2026-05-26T00:00:00.000Z",
          approved_by: "manager-1",
          manager_review_notes: null,
          rejection_reason: null,
          rejected_at: null,
          rejected_by: null,
          address_region: null,
          address_city_or_municipality: null,
          address_barangay: null,
          address_zip_code: null,
          created_at: "2026-05-26T00:00:00.000Z",
          updated_at: "2026-05-26T00:00:00.000Z",
        },
      },
    });

    const formData = createValidOfferFormData();
    formData.set("approvedAmount", "7000");
    formData.set("interestServiceChargeRate", "14.285714");
    formData.set("fees", "0");

    const result = await createLoanOffer(
      "application-1",
      previousState,
      formData,
    );

    expect(result).toEqual({
      ok: true,
      message: "Offer sent.",
    });
    expect(mockSupabase.rpc).toHaveBeenCalledWith("create_loan_offer", {
      p_loan_application_id: "application-1",
      p_approved_amount: 7000,
      p_repayment_amount: 8140,
      p_interest_service_charge_rate: 14.285714,
      p_fees: 0,
      p_processing_fee_rate: 0.02,
      p_processing_fee_amount: 140,
      p_due_date: "2099-01-01",
      p_remarks: "Offer based on submitted cash flow.",
      p_repayment_channel: "GCash",
      p_repayment_account_name: "Approved Lending",
      p_repayment_account_number: "09171234567",
      p_repayment_instructions: null,
    });
  });

  it("blocks offer at TypeScript level when approved principal exceeds available credit", async () => {
    const mockSupabase = {
      rpc: vi.fn(),
      from: vi.fn().mockReturnValue(
        createMockFromChain({
          requested_amount: 50000,
          available_credit_at_submission: 40000,
        }),
      ),
    };

    mockedRequireApprovedLender.mockResolvedValue({
      ok: true,
      supabase: asSupabase(mockSupabase),
      profile: {
        id: "lender-1",
        role: "lender",
        additional_roles: [],
        display_name: "Approved Lender",
        status: "active",
        created_at: "2026-05-26T00:00:00.000Z",
        updated_at: "2026-05-26T00:00:00.000Z",
        lenderProfile: {
          id: "lender-profile-1",
          user_id: "lender-1",
          organization_name: "Approved Lending",
          contact_person: "Approved Contact",
          phone_number: "+63 917 555 0199",
          business_address: "Quezon City",
          operating_area: "Metro Manila",
          business_registration_number: "DTI-12345",
          min_loan_amount: 5000,
          max_loan_amount: 50000,
          typical_repayment_terms: "1 to 6 months",
          lender_description: "Approved lender.",
          verification_status: "approved",
          approved_at: "2026-05-26T00:00:00.000Z",
          approved_by: "manager-1",
          manager_review_notes: null,
          rejection_reason: null,
          rejected_at: null,
          rejected_by: null,
          address_region: null,
          address_city_or_municipality: null,
          address_barangay: null,
          address_zip_code: null,
          created_at: "2026-05-26T00:00:00.000Z",
          updated_at: "2026-05-26T00:00:00.000Z",
        },
      },
    });

    const formData = createValidOfferFormData();
    formData.set("approvedAmount", "40001");
    formData.set("interestServiceChargeRate", "10");
    formData.set("fees", "0");

    const result = await createLoanOffer(
      "application-1",
      previousState,
      formData,
    );

    expect(result).toEqual({
      ok: false,
      message: "Approved principal cannot exceed the borrower's available credit.",
      fieldErrors: {
        approvedAmount: [
          "Approved principal cannot exceed the borrower's available credit.",
        ],
      },
    });
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  it("allows approved lender to send offer when total repayment equals available credit", async () => {
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          ok: true,
          message: "Offer sent.",
          loan_application_id: "application-1",
        },
        error: null,
      }),
      from: vi.fn().mockReturnValue(
        createMockFromChain({
          requested_amount: 50000,
          available_credit_at_submission: 50000,
        }),
      ),
    };

    mockedRequireApprovedLender.mockResolvedValue({
      ok: true,
      supabase: asSupabase(mockSupabase),
      profile: {
        id: "lender-1",
        role: "lender",
        additional_roles: [],
        display_name: "Approved Lender",
        status: "active",
        created_at: "2026-05-26T00:00:00.000Z",
        updated_at: "2026-05-26T00:00:00.000Z",
        lenderProfile: {
          id: "lender-profile-1",
          user_id: "lender-1",
          organization_name: "Approved Lending",
          contact_person: "Approved Contact",
          phone_number: "+63 917 555 0199",
          business_address: "Quezon City",
          operating_area: "Metro Manila",
          business_registration_number: "DTI-12345",
          min_loan_amount: 5000,
          max_loan_amount: 50000,
          typical_repayment_terms: "1 to 6 months",
          lender_description: "Approved lender.",
          verification_status: "approved",
          approved_at: "2026-05-26T00:00:00.000Z",
          approved_by: "manager-1",
          manager_review_notes: null,
          rejection_reason: null,
          rejected_at: null,
          rejected_by: null,
          address_region: null,
          address_city_or_municipality: null,
          address_barangay: null,
          address_zip_code: null,
          created_at: "2026-05-26T00:00:00.000Z",
          updated_at: "2026-05-26T00:00:00.000Z",
        },
      },
    });

    const formData = createValidOfferFormData();
    formData.set("approvedAmount", "43000");
    formData.set("interestServiceChargeRate", "11.627907");
    formData.set("fees", "2000");

    const result = await createLoanOffer(
      "application-1",
      previousState,
      formData,
    );

    expect(result).toEqual({
      ok: true,
      message: "Offer sent.",
    });
    expect(mockSupabase.rpc).toHaveBeenCalledWith("create_loan_offer", {
      p_loan_application_id: "application-1",
      p_approved_amount: 43000,
      p_repayment_amount: 50860,
      p_interest_service_charge_rate: 11.627907,
      p_fees: 2000,
      p_processing_fee_rate: 0.02,
      p_processing_fee_amount: 860,
      p_due_date: "2099-01-01",
      p_remarks: "Offer based on submitted cash flow.",
      p_repayment_channel: "GCash",
      p_repayment_account_name: "Approved Lending",
      p_repayment_account_number: "09171234567",
      p_repayment_instructions: null,
    });
  });

  it("rejects offer when approved amount exceeds borrower's requested amount", async () => {
    const mockSupabase = {
      rpc: vi.fn(),
      from: vi.fn().mockReturnValue(
        createMockFromChain({
          requested_amount: 25000,
          available_credit_at_submission: 50000,
        }),
      ),
    };

    mockedRequireApprovedLender.mockResolvedValue({
      ok: true,
      supabase: asSupabase(mockSupabase),
      profile: {
        id: "lender-1",
        role: "lender",
        additional_roles: [],
        display_name: "Approved Lender",
        status: "active",
        created_at: "2026-05-26T00:00:00.000Z",
        updated_at: "2026-05-26T00:00:00.000Z",
        lenderProfile: {
          id: "lender-profile-1",
          user_id: "lender-1",
          organization_name: "Approved Lending",
          contact_person: "Approved Contact",
          phone_number: "+63 917 555 0199",
          business_address: "Quezon City",
          operating_area: "Metro Manila",
          business_registration_number: "DTI-12345",
          min_loan_amount: 5000,
          max_loan_amount: 50000,
          typical_repayment_terms: "1 to 6 months",
          lender_description: "Approved lender.",
          verification_status: "approved",
          approved_at: "2026-05-26T00:00:00.000Z",
          approved_by: "manager-1",
          manager_review_notes: null,
          rejection_reason: null,
          rejected_at: null,
          rejected_by: null,
          address_region: null,
          address_city_or_municipality: null,
          address_barangay: null,
          address_zip_code: null,
          created_at: "2026-05-26T00:00:00.000Z",
          updated_at: "2026-05-26T00:00:00.000Z",
        },
      },
    });

    const formData = createValidOfferFormData();
    formData.set("approvedAmount", "30000");
    formData.set("interestServiceChargeRate", "7.5");
    formData.set("fees", "500");

    const result = await createLoanOffer(
      "application-1",
      previousState,
      formData,
    );

    expect(result).toEqual({
      ok: false,
      message: "Approved amount cannot exceed the borrower's requested amount.",
      fieldErrors: {
        approvedAmount: [
          "Approved amount cannot exceed the borrower's requested amount.",
        ],
      },
    });
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  it("allows offer when approved amount equals requested amount", async () => {
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          ok: true,
          message: "Offer sent.",
          loan_application_id: "application-1",
        },
        error: null,
      }),
      from: vi.fn().mockReturnValue(
        createMockFromChain({
          requested_amount: 25000,
          available_credit_at_submission: 50000,
        }),
      ),
    };

    mockedRequireApprovedLender.mockResolvedValue({
      ok: true,
      supabase: asSupabase(mockSupabase),
      profile: {
        id: "lender-1",
        role: "lender",
        additional_roles: [],
        display_name: "Approved Lender",
        status: "active",
        created_at: "2026-05-26T00:00:00.000Z",
        updated_at: "2026-05-26T00:00:00.000Z",
        lenderProfile: {
          id: "lender-profile-1",
          user_id: "lender-1",
          organization_name: "Approved Lending",
          contact_person: "Approved Contact",
          phone_number: "+63 917 555 0199",
          business_address: "Quezon City",
          operating_area: "Metro Manila",
          business_registration_number: "DTI-12345",
          min_loan_amount: 5000,
          max_loan_amount: 50000,
          typical_repayment_terms: "1 to 6 months",
          lender_description: "Approved lender.",
          verification_status: "approved",
          approved_at: "2026-05-26T00:00:00.000Z",
          approved_by: "manager-1",
          manager_review_notes: null,
          rejection_reason: null,
          rejected_at: null,
          rejected_by: null,
          address_region: null,
          address_city_or_municipality: null,
          address_barangay: null,
          address_zip_code: null,
          created_at: "2026-05-26T00:00:00.000Z",
          updated_at: "2026-05-26T00:00:00.000Z",
        },
      },
    });

    const formData = createValidOfferFormData();
    formData.set("approvedAmount", "25000");
    formData.set("interestServiceChargeRate", "7.5");
    formData.set("fees", "500");

    const result = await createLoanOffer(
      "application-1",
      previousState,
      formData,
    );

    expect(result).toEqual({
      ok: true,
      message: "Offer sent.",
    });
    expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
  });

  it("allows offer with zero borrower-paid fees", async () => {
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          ok: true,
          message: "Offer sent.",
          loan_application_id: "application-1",
        },
        error: null,
      }),
      from: vi.fn().mockReturnValue(
        createMockFromChain({
          requested_amount: 25000,
          available_credit_at_submission: 50000,
        }),
      ),
    };

    mockedRequireApprovedLender.mockResolvedValue({
      ok: true,
      supabase: asSupabase(mockSupabase),
      profile: {
        id: "lender-1",
        role: "lender",
        additional_roles: [],
        display_name: "Approved Lender",
        status: "active",
        created_at: "2026-05-26T00:00:00.000Z",
        updated_at: "2026-05-26T00:00:00.000Z",
        lenderProfile: {
          id: "lender-profile-1",
          user_id: "lender-1",
          organization_name: "Approved Lending",
          contact_person: "Approved Contact",
          phone_number: "+63 917 555 0199",
          business_address: "Quezon City",
          operating_area: "Metro Manila",
          business_registration_number: "DTI-12345",
          min_loan_amount: 5000,
          max_loan_amount: 50000,
          typical_repayment_terms: "1 to 6 months",
          lender_description: "Approved lender.",
          verification_status: "approved",
          approved_at: "2026-05-26T00:00:00.000Z",
          approved_by: "manager-1",
          manager_review_notes: null,
          rejection_reason: null,
          rejected_at: null,
          rejected_by: null,
          address_region: null,
          address_city_or_municipality: null,
          address_barangay: null,
          address_zip_code: null,
          created_at: "2026-05-26T00:00:00.000Z",
          updated_at: "2026-05-26T00:00:00.000Z",
        },
      },
    });

    const formData = createValidOfferFormData();
    formData.set("approvedAmount", "20000");
    formData.set("interestServiceChargeRate", "7.5");
    formData.set("fees", "0");

    const result = await createLoanOffer(
      "application-1",
      previousState,
      formData,
    );

    expect(result).toEqual({
      ok: true,
      message: "Offer sent.",
    });
    expect(mockSupabase.rpc).toHaveBeenCalledWith("create_loan_offer", {
      p_loan_application_id: "application-1",
      p_approved_amount: 20000,
      p_repayment_amount: 21900,
      p_interest_service_charge_rate: 7.5,
      p_fees: 0,
      p_processing_fee_rate: 0.02,
      p_processing_fee_amount: 400,
      p_due_date: "2099-01-01",
      p_remarks: "Offer based on submitted cash flow.",
      p_repayment_channel: "GCash",
      p_repayment_account_name: "Approved Lending",
      p_repayment_account_number: "09171234567",
      p_repayment_instructions: null,
    });
  });
});
