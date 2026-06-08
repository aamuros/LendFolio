"use server";

import { revalidatePath } from "next/cache";
import { requireBorrower, type AccessResult } from "@/lib/access-control";
import {
  loadBorrowerActiveLoans,
  type ActiveLoanSummary,
} from "@/lib/active-loans";
import {
  calculateTotalBusinessExpenses,
  calculateTotalExistingDebtPayments,
  calculateTotalHouseholdExpenses,
  normalizeDebtPaymentValues,
  borrowerPortfolioStepLabels,
  borrowerPortfolioStepSchemas,
  borrowerPortfolioSchema,
  getCompletedBorrowerPortfolioSteps,
  getNextIncompleteBorrowerPortfolioStep,
  mapBorrowerPortfolioRow,
  resolveMainProductsOrServicesValue,
  resolveBorrowerAddressFields,
  type BorrowerPortfolioStep,
  type BorrowerPortfolioInput,
} from "@/lib/borrower-portfolio";
import {
  calculateBorrowerAvailableCredit,
  type BorrowerCreditSummary,
} from "@/lib/credit-limit";
import {
  evaluateBorrowerReadiness,
  type BorrowerReadinessResult,
} from "@/lib/borrower-readiness";
import {
  buildConsentStatus,
  getRequiredConsentVersions,
  hasCurrentRequiredConsents,
  type ConsentStatus,
} from "@/lib/consents";
import { loadUserConsents } from "@/lib/user-consents";
import {
  borrowerVerificationDocumentAllowedTypes,
  borrowerVerificationDocumentBucket,
  borrowerVerificationDocumentMaxFileSize,
  createSafeUploadFileName,
  getBorrowerVerificationMessage,
  getBorrowerVerificationStatus,
  isBorrowerVerificationDocumentType,
  type BorrowerVerificationSummary,
} from "@/lib/borrower-verification";
import {
  loanApplicationSchema,
  mapLoanApplicationRow,
  type LoanApplicationInput,
  type LoanApplicationSummary,
} from "@/lib/loan-application";
import { mapLoanOfferRow, type LoanOfferSummary } from "@/lib/loan-offer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export type BorrowerLoanApplicationSummary = LoanApplicationSummary & {
  offers: LoanOfferSummary[];
  activeLoan: ActiveLoanSummary | null;
};

export type BorrowerPortfolioSaveResult =
  | {
      ok: true;
      mode: "supabase";
      message: string;
    }
  | {
      ok: false;
      mode: "auth" | "validation" | "supabase";
      message: string;
      fieldErrors?: Partial<Record<keyof BorrowerPortfolioInput, string[]>>;
    };

export type BorrowerPortfolioStepSaveResult =
  | {
      ok: true;
      mode: "supabase";
      message: string;
      portfolio: BorrowerPortfolioInput;
      completedSteps: BorrowerPortfolioStep[];
      nextIncompleteStep: BorrowerPortfolioStep;
    }
  | {
      ok: false;
      mode: "auth" | "validation" | "supabase";
      message: string;
      fieldErrors?: Partial<Record<keyof BorrowerPortfolioInput, string[]>>;
    };

export type BorrowerPortfolioLoadResult =
  | {
      ok: true;
      mode: "supabase";
      data: BorrowerPortfolioInput | null;
      message: string;
    }
  | {
      ok: false;
      mode: "auth" | "supabase";
      data: null;
      message: string;
    };

export type LoanApplicationSubmitResult =
  | {
      ok: true;
      mode: "supabase";
      application: LoanApplicationSummary;
      message: string;
    }
  | {
      ok: false;
      mode:
        | "auth"
        | "validation"
        | "missing-portfolio"
        | "readiness"
        | "borrower-verification"
        | "consent-required"
        | "credit-limit"
        | "active-application"
        | "supabase";
      message: string;
      fieldErrors?: Partial<Record<keyof LoanApplicationInput, string[]>>;
    };

export type LoanApplicationUpdateResult =
  | {
      ok: true;
      application: LoanApplicationSummary;
      message: string;
    }
  | {
      ok: false;
      mode: "auth" | "validation" | "supabase";
      message: string;
      fieldErrors?: Partial<Record<keyof LoanApplicationInput, string[]>>;
    };

export type LoanApplicationWithdrawResult =
  | {
      ok: true;
      application: LoanApplicationSummary;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

export type LoanApplicationsLoadResult =
  | {
      ok: true;
      mode: "supabase";
      applications: BorrowerLoanApplicationSummary[];
      hasPortfolio: boolean;
      borrowerVerification: BorrowerVerificationSummary;
      creditSummary: BorrowerCreditSummary | null;
      readiness: BorrowerReadinessResult | null;
      consentStatuses: {
        borrowerDocumentUpload: ConsentStatus;
        borrowerLoanApplication: ConsentStatus;
      };
      message: string;
    }
  | {
      ok: false;
      mode: "auth" | "supabase";
      applications: BorrowerLoanApplicationSummary[];
      hasPortfolio: boolean;
      borrowerVerification: BorrowerVerificationSummary | null;
      creditSummary: BorrowerCreditSummary | null;
      readiness: BorrowerReadinessResult | null;
      consentStatuses: {
        borrowerDocumentUpload: ConsentStatus;
        borrowerLoanApplication: ConsentStatus;
      } | null;
      message: string;
    };

export type LoanOfferAcceptResult =
  | {
      ok: true;
      message: string;
      activeLoanId: string | null;
    }
  | {
      ok: false;
      message: string;
    };

export type LoanOfferDeclineResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

export type RepaymentProofSubmitResult =
  | {
      ok: true;
      message: string;
      proofId: string;
    }
  | {
      ok: false;
      message: string;
    };

export type BorrowerVerificationDocumentSubmitResult =
  | {
      ok: true;
      message: string;
      documentId: string;
    }
  | {
      ok: false;
      code?: "consent_required";
      message: string;
    };

const repaymentProofBucket = "repayment-proofs";
const repaymentProofMaxFileSize = 5 * 1024 * 1024;
const repaymentProofAllowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

const borrowerPortfolioCreditSelect =
  "id, borrower_id, business_name, business_description, business_type, started_operating_at, business_address, barangay, city_or_municipality, province, region, zip_code, location, operating_model, primary_sales_channel, revenue_period, revenue_confidence, monthly_gross_revenue, monthly_expenses, existing_loan_payments, years_in_operation, expense_breakdown, debt_obligation_summary, loan_purpose_context, profile_last_confirmed_at, profile_review_status, created_at, updated_at, mobile_number, home_address, years_at_current_address, emergency_contact_name, emergency_contact_number, emergency_contact_relationship, is_business_address_same_as_home, ownership_type, borrower_role, business_schedule, number_of_employees, main_products_or_services, main_suppliers, keeps_sales_records, uses_bank_or_ewallet, offers_customer_credit, has_business_registration, business_registration_type, registration_number, registration_date, unregistered_reason, average_daily_sales, average_weekly_sales, best_month_sales, worst_month_sales, monthly_inventory_cost, monthly_business_rent, monthly_business_electricity, monthly_business_water, monthly_helper_salary, monthly_transportation_delivery, monthly_packaging_cost, monthly_platform_fees, monthly_maintenance_repairs, monthly_supplier_credit_payment, other_business_expenses, business_expenses_completed, monthly_rent_or_mortgage, monthly_electricity_bill, monthly_water_bill, monthly_internet_phone_bill, monthly_food_groceries, monthly_transportation, monthly_tuition_education, monthly_medical_expenses, monthly_insurance, monthly_family_support, other_household_expenses, number_of_dependents, number_of_earning_household_members, household_expenses_completed, has_existing_debts, personal_loan_payments, business_loan_payments, vehicle_loan_payments, home_loan_payments, lending_app_payments, informal_loan_payments, buy_now_pay_later_payments, credit_card_payments, co_maker_guaranteed_loan_payments, other_debt_payments, existing_debt_declaration_completed, cash_on_hand, bank_savings, ewallet_balance, inventory_value, business_equipment_value, vehicle_value, property_land_value, other_assets_value, estimated_customer_credit_amount, average_collection_period, keeps_customer_debt_list, has_overdue_loans, missed_payments_last_12_months, has_unpaid_lending_app_loans, has_bounced_checks, is_co_maker_or_guarantor, has_debt_related_legal_case, has_repossession_history, has_tax_arrears, business_temporarily_stopped, confirms_business_operating, confirms_information_true, consents_to_data_processing, consents_to_credit_check";

export async function loadBorrowerPortfolio(
  verifiedAccess?: AccessResult,
): Promise<BorrowerPortfolioLoadResult> {
  try {
    const supabase =
      verifiedAccess?.ok
        ? verifiedAccess.supabase
        : await createSupabaseServerClient();
    const access = verifiedAccess ?? (await requireBorrower(supabase));

    if (!access.ok) {
      return {
        ok: false,
        mode: "auth",
        data: null,
        message: access.message,
      };
    }

    const { data, error } = await supabase
      .from("borrower_portfolios")
      .select(borrowerPortfolioCreditSelect)
      .eq("borrower_id", access.profile.id)
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        mode: "supabase",
        data: null,
        message: "Could not load your profile.",
      };
    }

    return {
      ok: true,
      mode: "supabase",
      data: data ? mapBorrowerPortfolioRow(data) : null,
      message: data ? "Profile loaded." : "",
    };
  } catch {
    return {
      ok: false,
      mode: "auth",
      data: null,
      message: "Sign in to continue.",
    };
  }
}

export async function saveBorrowerPortfolio(
  values: BorrowerPortfolioInput,
): Promise<BorrowerPortfolioSaveResult> {
  const parsed = borrowerPortfolioSchema.safeParse(values);

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();

    return {
      ok: false,
      mode: "validation",
      message: "Review the highlighted fields before saving.",
      fieldErrors,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireBorrower(supabase);

    if (!access.ok) {
      return {
        ok: false,
        mode: "auth",
        message: access.message,
      };
    }

    const resolvedAddress = resolveBorrowerAddressFields(parsed.data);
    const totalBusinessExpenses = calculateTotalBusinessExpenses(parsed.data);
    const totalExistingDebtPayments =
      calculateTotalExistingDebtPayments(parsed.data);
    const debtValues = normalizeDebtPaymentValues(parsed.data);
    const totalHouseholdExpenses = calculateTotalHouseholdExpenses(parsed.data);

    const { error } = await supabase.from("borrower_portfolios").upsert(
      {
        borrower_id: access.profile.id,
        mobile_number: parsed.data.mobileNumber || null,
        home_address: parsed.data.homeAddress || null,
        years_at_current_address: parsed.data.yearsAtCurrentAddress,
        emergency_contact_name: parsed.data.emergencyContactName || null,
        emergency_contact_number: parsed.data.emergencyContactNumber || null,
        emergency_contact_relationship:
          parsed.data.emergencyContactRelationship || null,
        business_name: parsed.data.businessName,
        business_type: parsed.data.businessType,
        location: resolvedAddress.location,
        business_address: resolvedAddress.businessAddress,
        barangay: resolvedAddress.barangay,
        city_or_municipality: resolvedAddress.cityOrMunicipality,
        region: resolvedAddress.region,
        zip_code: resolvedAddress.zipCode,
        is_business_address_same_as_home:
          parsed.data.isBusinessAddressSameAsHome,
        ownership_type: parsed.data.ownershipType,
        borrower_role: parsed.data.borrowerRole,
        operating_model: parsed.data.operatingModel,
        primary_sales_channel: parsed.data.primarySalesChannel,
        business_schedule: parsed.data.businessSchedule,
        number_of_employees: parsed.data.numberOfEmployees,
        main_products_or_services:
          resolveMainProductsOrServicesValue(parsed.data) || null,
        main_suppliers: parsed.data.mainSuppliers?.trim() || null,
        keeps_sales_records: parsed.data.keepsSalesRecords,
        uses_bank_or_ewallet: parsed.data.usesBankOrEwallet,
        offers_customer_credit: parsed.data.offersCustomerCredit,
        has_business_registration: parsed.data.hasBusinessRegistration,
        business_registration_type: parsed.data.hasBusinessRegistration
          ? parsed.data.businessRegistrationType
          : null,
        registration_number: parsed.data.registrationNumber || null,
        registration_date: parsed.data.registrationDate || null,
        unregistered_reason: parsed.data.unregisteredReason || null,
        average_daily_sales: parsed.data.averageDailySales,
        average_weekly_sales: parsed.data.averageWeeklySales,
        revenue_period: parsed.data.revenuePeriod,
        revenue_confidence: parsed.data.revenueConfidence,
        best_month_sales: parsed.data.bestMonthSales,
        worst_month_sales: parsed.data.worstMonthSales,
        monthly_gross_revenue: parsed.data.monthlyGrossRevenue,
        monthly_inventory_cost: parsed.data.monthlyInventoryCost,
        monthly_business_rent: parsed.data.monthlyBusinessRent,
        monthly_business_electricity: parsed.data.monthlyBusinessElectricity,
        monthly_business_water: parsed.data.monthlyBusinessWater,
        monthly_helper_salary: parsed.data.monthlyHelperSalary,
        monthly_transportation_delivery:
          parsed.data.monthlyTransportationDelivery,
        monthly_packaging_cost: parsed.data.monthlyPackagingCost,
        monthly_platform_fees: parsed.data.monthlyPlatformFees,
        monthly_maintenance_repairs: parsed.data.monthlyMaintenanceRepairs,
        monthly_supplier_credit_payment:
          parsed.data.monthlySupplierCreditPayment,
        other_business_expenses: parsed.data.otherBusinessExpenses,
        monthly_expenses: totalBusinessExpenses,
        business_expenses_completed: true,
        monthly_rent_or_mortgage: parsed.data.monthlyRentOrMortgage,
        monthly_electricity_bill: parsed.data.monthlyElectricityBill,
        monthly_water_bill: parsed.data.monthlyWaterBill,
        monthly_internet_phone_bill: parsed.data.monthlyInternetPhoneBill,
        monthly_food_groceries: parsed.data.monthlyFoodGroceries,
        monthly_transportation: parsed.data.monthlyTransportation,
        monthly_tuition_education: parsed.data.monthlyTuitionEducation,
        monthly_medical_expenses: parsed.data.monthlyMedicalExpenses,
        monthly_insurance: parsed.data.monthlyInsurance,
        monthly_family_support: parsed.data.monthlyFamilySupport,
        other_household_expenses: parsed.data.otherHouseholdExpenses,
        number_of_dependents: parsed.data.numberOfDependents,
        number_of_earning_household_members:
          parsed.data.numberOfEarningHouseholdMembers,
        household_expenses_completed: parsed.data.householdExpensesCompleted,
        has_existing_debts: parsed.data.hasExistingDebts,
        personal_loan_payments:
          debtValues.personalLoanPayments ?? parsed.data.personalLoanPayments,
        business_loan_payments:
          debtValues.businessLoanPayments ?? parsed.data.businessLoanPayments,
        vehicle_loan_payments:
          debtValues.vehicleLoanPayments ?? parsed.data.vehicleLoanPayments,
        home_loan_payments:
          debtValues.homeLoanPayments ?? parsed.data.homeLoanPayments,
        lending_app_payments:
          debtValues.lendingAppPayments ?? parsed.data.lendingAppPayments,
        informal_loan_payments:
          debtValues.informalLoanPayments ?? parsed.data.informalLoanPayments,
        buy_now_pay_later_payments:
          debtValues.buyNowPayLaterPayments ??
          parsed.data.buyNowPayLaterPayments,
        credit_card_payments:
          debtValues.creditCardPayments ?? parsed.data.creditCardPayments,
        co_maker_guaranteed_loan_payments:
          debtValues.coMakerGuaranteedLoanPayments ??
          parsed.data.coMakerGuaranteedLoanPayments,
        other_debt_payments:
          debtValues.otherDebtPayments ?? parsed.data.otherDebtPayments,
        existing_loan_payments: totalExistingDebtPayments,
        existing_debt_declaration_completed:
          parsed.data.existingDebtDeclarationCompleted,
        cash_on_hand: parsed.data.cashOnHand,
        bank_savings: parsed.data.bankSavings,
        ewallet_balance: parsed.data.ewalletBalance,
        inventory_value: parsed.data.inventoryValue,
        business_equipment_value: parsed.data.businessEquipmentValue,
        vehicle_value: parsed.data.vehicleValue,
        property_land_value: parsed.data.propertyLandValue,
        other_assets_value: parsed.data.otherAssetsValue,
        estimated_customer_credit_amount:
          parsed.data.estimatedCustomerCreditAmount,
        average_collection_period: parsed.data.averageCollectionPeriod,
        keeps_customer_debt_list: parsed.data.keepsCustomerDebtList,
        years_in_operation: parsed.data.yearsInOperation,
        loan_purpose_context: parsed.data.loanPurposeContext?.trim() || null,
        has_overdue_loans: parsed.data.hasOverdueLoans,
        missed_payments_last_12_months:
          parsed.data.missedPaymentsLast12Months,
        has_unpaid_lending_app_loans:
          parsed.data.hasUnpaidLendingAppLoans,
        has_bounced_checks: parsed.data.hasBouncedChecks,
        is_co_maker_or_guarantor: parsed.data.isCoMakerOrGuarantor,
        has_debt_related_legal_case: parsed.data.hasDebtRelatedLegalCase,
        has_repossession_history: parsed.data.hasRepossessionHistory,
        has_tax_arrears: parsed.data.hasTaxArrears,
        business_temporarily_stopped: parsed.data.businessTemporarilyStopped,
        confirms_business_operating: parsed.data.confirmsBusinessOperating,
        confirms_information_true: parsed.data.confirmsInformationTrue,
        consents_to_data_processing: parsed.data.consentsToDataProcessing,
        consents_to_credit_check: parsed.data.consentsToCreditCheck,
        expense_breakdown: {
          inventory: parsed.data.monthlyInventoryCost,
          rent: parsed.data.monthlyBusinessRent,
          utilities:
            parsed.data.monthlyBusinessElectricity +
            parsed.data.monthlyBusinessWater,
          payroll: parsed.data.monthlyHelperSalary,
          supplier_credit: parsed.data.monthlySupplierCreditPayment,
          other: parsed.data.otherBusinessExpenses,
          total_business_expenses: totalBusinessExpenses,
          total_household_expenses: totalHouseholdExpenses,
        },
        debt_obligation_summary: {
          has_existing_debts: parsed.data.hasExistingDebts,
          total_existing_debt_payments: totalExistingDebtPayments,
        },
        profile_last_confirmed_at: new Date().toISOString(),
        profile_review_status: parsed.data.hasBusinessRegistration
          ? "self_declared"
          : "needs_review",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "borrower_id" },
    );

    if (error) {
      return {
        ok: false,
        mode: "supabase",
        message: "Could not save your profile.",
      };
    }

    revalidatePath("/borrower");

    return {
      ok: true,
      mode: "supabase",
      message: "Profile saved. Next, verify your borrower profile by uploading a valid ID and business proof.",
    };
  } catch {
    return {
      ok: false,
      mode: "auth",
      message: "Sign in to continue.",
    };
  }
}

export async function saveBorrowerPortfolioStep(
  step: BorrowerPortfolioStep,
  values: BorrowerPortfolioInput,
): Promise<BorrowerPortfolioStepSaveResult> {
  const schema = borrowerPortfolioStepSchemas[step];
  const parsed = schema.safeParse(values);

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();

    return {
      ok: false,
      mode: "validation",
      message: "Review the highlighted fields before saving.",
      fieldErrors,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireBorrower(supabase);

    if (!access.ok) {
      return {
        ok: false,
        mode: "auth",
        message: access.message,
      };
    }

    const { data: existingRow, error: loadError } = await supabase
      .from("borrower_portfolios")
      .select(borrowerPortfolioCreditSelect)
      .eq("borrower_id", access.profile.id)
      .maybeSingle();

    if (loadError) {
      return {
        ok: false,
        mode: "supabase",
        message: "Could not load your profile.",
      };
    }

    const existingPortfolio = existingRow
      ? mapBorrowerPortfolioRow(existingRow)
      : null;
    const mergedPortfolio = {
      ...(existingPortfolio ?? {}),
      ...values,
    } as BorrowerPortfolioInput;
    const payload = buildBorrowerPortfolioStepPayload(
      step,
      mergedPortfolio,
      access.profile.id,
    );

    const { data: savedRow, error: saveError } = await supabase
      .from("borrower_portfolios")
      .upsert(payload as never, { onConflict: "borrower_id" })
      .select(borrowerPortfolioCreditSelect)
      .single();

    if (saveError || !savedRow) {
      return {
        ok: false,
        mode: "supabase",
        message: "Could not save this profile section.",
      };
    }

    const savedPortfolio = mapBorrowerPortfolioRow(savedRow);
    const completedSteps = getCompletedBorrowerPortfolioSteps(savedPortfolio);
    const nextIncompleteStep =
      getNextIncompleteBorrowerPortfolioStep(savedPortfolio);

    revalidatePath("/borrower");

    return {
      ok: true,
      mode: "supabase",
      message: `${borrowerPortfolioStepLabels[step]} saved.`,
      portfolio: savedPortfolio,
      completedSteps,
      nextIncompleteStep,
    };
  } catch {
    return {
      ok: false,
      mode: "auth",
      message: "Sign in to continue.",
    };
  }
}

function buildBorrowerPortfolioStepPayload(
  step: BorrowerPortfolioStep,
  portfolio: BorrowerPortfolioInput,
  borrowerId: string,
) {
  const now = new Date().toISOString();
  const base = {
    borrower_id: borrowerId,
    updated_at: now,
  };

  if (step === "homeAddress") {
    return {
      ...base,
      mobile_number: portfolio.mobileNumber || null,
      home_address:
        portfolio.homeAddress?.trim() ||
        [
          portfolio.homeStreetAddress,
          portfolio.homeAddressSelection.barangay,
          portfolio.homeAddressSelection.cityOrMunicipality,
          portfolio.homeAddressSelection.regionName ||
            portfolio.homeAddressSelection.regionCode,
          portfolio.homeAddressSelection.zipCode,
        ]
          .filter(Boolean)
          .join(", ") ||
        null,
      years_at_current_address: portfolio.yearsAtCurrentAddress,
      emergency_contact_name: portfolio.emergencyContactName || null,
      emergency_contact_number: portfolio.emergencyContactNumber || null,
      emergency_contact_relationship:
        portfolio.emergencyContactRelationship || null,
    };
  }

  if (step === "businessBasics") {
    return {
      ...base,
      business_name: portfolio.businessName,
      business_type: portfolio.businessType,
      ownership_type: portfolio.ownershipType,
      borrower_role: portfolio.borrowerRole,
      years_in_operation: portfolio.yearsInOperation,
      operating_model: portfolio.operatingModel,
      primary_sales_channel: portfolio.primarySalesChannel,
      business_schedule: portfolio.businessSchedule,
      number_of_employees: portfolio.numberOfEmployees,
      main_products_or_services:
        resolveMainProductsOrServicesValue(portfolio) || null,
      main_suppliers: portfolio.mainSuppliers?.trim() || null,
      keeps_sales_records: portfolio.keepsSalesRecords,
      uses_bank_or_ewallet: portfolio.usesBankOrEwallet,
    };
  }

  if (step === "businessAddress") {
    const resolvedAddress = resolveBorrowerAddressFields(portfolio);

    return {
      ...base,
      location: resolvedAddress.location,
      business_address: resolvedAddress.businessAddress,
      barangay: resolvedAddress.barangay,
      city_or_municipality: resolvedAddress.cityOrMunicipality,
      region: resolvedAddress.region,
      zip_code: resolvedAddress.zipCode,
      is_business_address_same_as_home:
        portfolio.isBusinessAddressSameAsHome,
    };
  }

  if (step === "businessOperations") {
    return {
      ...base,
      has_business_registration: portfolio.hasBusinessRegistration,
      business_registration_type: portfolio.hasBusinessRegistration
        ? portfolio.businessRegistrationType
        : null,
      registration_number: portfolio.registrationNumber || null,
      registration_date: portfolio.registrationDate || null,
      unregistered_reason: portfolio.unregisteredReason || null,
      profile_review_status: portfolio.hasBusinessRegistration
        ? "self_declared"
        : "needs_review",
    };
  }

  if (step === "financials") {
    const monthlyGrossRevenue =
      portfolio.monthlyGrossRevenue > 0
        ? portfolio.monthlyGrossRevenue
        : portfolio.averageDailySales > 0
          ? portfolio.averageDailySales * 30
          : 0;

    return {
      ...base,
      average_daily_sales: portfolio.averageDailySales,
      average_weekly_sales: portfolio.averageWeeklySales,
      monthly_gross_revenue: monthlyGrossRevenue,
      revenue_period: portfolio.revenuePeriod,
      revenue_confidence: portfolio.revenueConfidence,
      best_month_sales: portfolio.bestMonthSales,
      worst_month_sales: portfolio.worstMonthSales,
    };
  }

  if (step === "businessExpenses") {
    const totalBusinessExpenses = calculateTotalBusinessExpenses(portfolio);

    return {
      ...base,
      monthly_inventory_cost: portfolio.monthlyInventoryCost,
      monthly_business_rent: portfolio.monthlyBusinessRent,
      monthly_business_electricity: portfolio.monthlyBusinessElectricity,
      monthly_business_water: portfolio.monthlyBusinessWater,
      monthly_helper_salary: portfolio.monthlyHelperSalary,
      monthly_transportation_delivery:
        portfolio.monthlyTransportationDelivery,
      monthly_packaging_cost: portfolio.monthlyPackagingCost,
      monthly_platform_fees: portfolio.monthlyPlatformFees,
      monthly_maintenance_repairs: portfolio.monthlyMaintenanceRepairs,
      monthly_supplier_credit_payment:
        portfolio.monthlySupplierCreditPayment,
      other_business_expenses: portfolio.otherBusinessExpenses,
      monthly_expenses: totalBusinessExpenses,
      business_expenses_completed: true,
      expense_breakdown: {
        inventory: portfolio.monthlyInventoryCost,
        rent: portfolio.monthlyBusinessRent,
        utilities:
          portfolio.monthlyBusinessElectricity +
          portfolio.monthlyBusinessWater,
        payroll: portfolio.monthlyHelperSalary,
        supplier_credit: portfolio.monthlySupplierCreditPayment,
        other: portfolio.otherBusinessExpenses,
        total_business_expenses: totalBusinessExpenses,
        total_household_expenses: calculateTotalHouseholdExpenses(portfolio),
      },
    };
  }

  if (step === "householdExpenses") {
    const totalBusinessExpenses = calculateTotalBusinessExpenses(portfolio);
    const totalHouseholdExpenses = calculateTotalHouseholdExpenses(portfolio);

    return {
      ...base,
      monthly_expenses: totalBusinessExpenses,
      monthly_rent_or_mortgage: portfolio.monthlyRentOrMortgage,
      monthly_electricity_bill: portfolio.monthlyElectricityBill,
      monthly_water_bill: portfolio.monthlyWaterBill,
      monthly_internet_phone_bill: portfolio.monthlyInternetPhoneBill,
      monthly_food_groceries: portfolio.monthlyFoodGroceries,
      monthly_transportation: portfolio.monthlyTransportation,
      monthly_tuition_education: portfolio.monthlyTuitionEducation,
      monthly_medical_expenses: portfolio.monthlyMedicalExpenses,
      monthly_insurance: portfolio.monthlyInsurance,
      monthly_family_support: portfolio.monthlyFamilySupport,
      other_household_expenses: portfolio.otherHouseholdExpenses,
      number_of_dependents: portfolio.numberOfDependents,
      number_of_earning_household_members:
        portfolio.numberOfEarningHouseholdMembers,
      household_expenses_completed: true,
      expense_breakdown: {
        inventory: portfolio.monthlyInventoryCost,
        rent: portfolio.monthlyBusinessRent,
        utilities:
          portfolio.monthlyBusinessElectricity +
          portfolio.monthlyBusinessWater,
        payroll: portfolio.monthlyHelperSalary,
        supplier_credit: portfolio.monthlySupplierCreditPayment,
        other: portfolio.otherBusinessExpenses,
        total_business_expenses: totalBusinessExpenses,
        total_household_expenses: totalHouseholdExpenses,
      },
    };
  }

  if (step === "existingDebtsAndAssets") {
    const debtValues = normalizeDebtPaymentValues(portfolio);
    const totalExistingDebtPayments =
      calculateTotalExistingDebtPayments(portfolio);

    return {
      ...base,
      has_existing_debts: portfolio.hasExistingDebts,
      personal_loan_payments:
        debtValues.personalLoanPayments ?? portfolio.personalLoanPayments,
      business_loan_payments:
        debtValues.businessLoanPayments ?? portfolio.businessLoanPayments,
      vehicle_loan_payments:
        debtValues.vehicleLoanPayments ?? portfolio.vehicleLoanPayments,
      home_loan_payments:
        debtValues.homeLoanPayments ?? portfolio.homeLoanPayments,
      lending_app_payments:
        debtValues.lendingAppPayments ?? portfolio.lendingAppPayments,
      informal_loan_payments:
        debtValues.informalLoanPayments ?? portfolio.informalLoanPayments,
      buy_now_pay_later_payments:
        debtValues.buyNowPayLaterPayments ?? portfolio.buyNowPayLaterPayments,
      credit_card_payments:
        debtValues.creditCardPayments ?? portfolio.creditCardPayments,
      co_maker_guaranteed_loan_payments:
        debtValues.coMakerGuaranteedLoanPayments ??
        portfolio.coMakerGuaranteedLoanPayments,
      other_debt_payments:
        debtValues.otherDebtPayments ?? portfolio.otherDebtPayments,
      existing_loan_payments: totalExistingDebtPayments,
      existing_debt_declaration_completed: true,
      cash_on_hand: portfolio.cashOnHand,
      bank_savings: portfolio.bankSavings,
      ewallet_balance: portfolio.ewalletBalance,
      inventory_value: portfolio.inventoryValue,
      business_equipment_value: portfolio.businessEquipmentValue,
      vehicle_value: portfolio.vehicleValue,
      property_land_value: portfolio.propertyLandValue,
      other_assets_value: portfolio.otherAssetsValue,
      debt_obligation_summary: {
        has_existing_debts: portfolio.hasExistingDebts,
        total_existing_debt_payments: totalExistingDebtPayments,
      },
    };
  }

  if (step === "loanUse") {
    return {
      ...base,
      offers_customer_credit: portfolio.offersCustomerCredit,
      estimated_customer_credit_amount:
        portfolio.estimatedCustomerCreditAmount,
      average_collection_period: portfolio.averageCollectionPeriod,
      keeps_customer_debt_list: portfolio.keepsCustomerDebtList,
      loan_purpose_context: formatBorrowerLoanPurposeContext(portfolio),
      has_overdue_loans: portfolio.hasOverdueLoans,
      missed_payments_last_12_months: portfolio.missedPaymentsLast12Months,
      has_unpaid_lending_app_loans: portfolio.hasUnpaidLendingAppLoans,
      has_bounced_checks: portfolio.hasBouncedChecks,
      is_co_maker_or_guarantor: portfolio.isCoMakerOrGuarantor,
      has_debt_related_legal_case: portfolio.hasDebtRelatedLegalCase,
      has_repossession_history: portfolio.hasRepossessionHistory,
      has_tax_arrears: portfolio.hasTaxArrears,
      business_temporarily_stopped: portfolio.businessTemporarilyStopped,
      confirms_business_operating: portfolio.confirmsBusinessOperating,
    };
  }

  return {
    ...base,
    mobile_number: portfolio.mobileNumber || null,
    home_address:
      portfolio.homeAddress?.trim() ||
      [
        portfolio.homeStreetAddress,
        portfolio.homeAddressSelection.barangay,
        portfolio.homeAddressSelection.cityOrMunicipality,
        portfolio.homeAddressSelection.regionName ||
          portfolio.homeAddressSelection.regionCode,
        portfolio.homeAddressSelection.zipCode,
      ]
        .filter(Boolean)
        .join(", ") ||
      null,
    years_at_current_address: portfolio.yearsAtCurrentAddress,
    emergency_contact_name: portfolio.emergencyContactName || null,
    emergency_contact_number: portfolio.emergencyContactNumber || null,
    emergency_contact_relationship:
      portfolio.emergencyContactRelationship || null,
    confirms_information_true: portfolio.confirmsInformationTrue,
    consents_to_data_processing: portfolio.consentsToDataProcessing,
    consents_to_credit_check: portfolio.consentsToCreditCheck,
    profile_last_confirmed_at: now,
  };
}

function formatBorrowerLoanPurposeContext(
  portfolio: Pick<
    BorrowerPortfolioInput,
    | "loanPurposeCategory"
    | "loanPurposeOther"
    | "loanPurposeDetails"
    | "loanPurposeContext"
  >,
) {
  const category =
    portfolio.loanPurposeCategory === "other"
      ? portfolio.loanPurposeOther?.trim()
      : portfolio.loanPurposeCategory.replace(/_/g, " ");
  const details = portfolio.loanPurposeDetails?.trim();
  const existingContext = portfolio.loanPurposeContext?.trim();

  if (category && details) return `${category}: ${details}`;
  if (existingContext) return existingContext;
  return category ?? "";
}

export async function loadBorrowerLoanApplications(
  verifiedAccess?: AccessResult,
): Promise<LoanApplicationsLoadResult> {
  try {
    const supabase =
      verifiedAccess?.ok
        ? verifiedAccess.supabase
        : await createSupabaseServerClient();
    const access = verifiedAccess ?? (await requireBorrower(supabase));

    if (!access.ok) {
      return {
        ok: false,
        mode: "auth",
        applications: [],
        hasPortfolio: false,
        borrowerVerification: null,
        creditSummary: null,
        readiness: null,
        consentStatuses: null,
        message: access.message,
      };
    }

    const userConsents = await loadUserConsents(supabase, access.profile.id);
    const consentStatuses = {
      borrowerDocumentUpload: buildConsentStatus(
        "borrower_document_upload",
        userConsents,
      ),
      borrowerLoanApplication: buildConsentStatus(
        "borrower_loan_application",
        userConsents,
      ),
    };
    const borrowerVerification = await getBorrowerVerificationStatus(
      supabase,
      access.profile.id,
    );

    const { data: portfolio, error: portfolioError } = await supabase
      .from("borrower_portfolios")
      .select(borrowerPortfolioCreditSelect)
      .eq("borrower_id", access.profile.id)
      .maybeSingle();

    if (portfolioError) {
      return {
        ok: false,
        mode: "supabase",
        applications: [],
        hasPortfolio: false,
        borrowerVerification,
        creditSummary: null,
        readiness: null,
        consentStatuses,
        message: "Could not confirm your profile.",
      };
    }

    const creditSummary = portfolio
      ? await loadBorrowerCreditSummary(access.profile.id, portfolio, supabase)
      : null;
    const readiness = evaluateBorrowerReadiness(
      portfolio ? mapBorrowerPortfolioRow(portfolio) : null,
      {
        accountStatus: access.profile.status,
        borrowerVerification,
        loanApplicationConsent: consentStatuses.borrowerLoanApplication,
        creditSummary,
      },
    );

    const { data, error } = await supabase
      .from("loan_applications")
      .select(
        "id, borrower_id, borrower_portfolio_id, requested_amount, credit_limit_at_submission, used_credit_at_submission, available_credit_at_submission, monthly_net_cash_flow_at_submission, credit_readiness_status, borrower_profile_snapshot, borrower_readiness_snapshot, purpose, preferred_term, remarks, status, submitted_at, created_at, updated_at",
      )
      .eq("borrower_id", access.profile.id)
      .order("submitted_at", { ascending: false });

    if (error) {
      return {
        ok: false,
        mode: "supabase",
        applications: [],
        hasPortfolio: Boolean(portfolio),
        borrowerVerification,
        creditSummary,
        readiness,
        consentStatuses,
        message: "Could not load applications.",
      };
    }

    if (data.length === 0) {
      return {
        ok: true,
        mode: "supabase",
        applications: [],
        hasPortfolio: Boolean(portfolio),
        borrowerVerification,
        creditSummary,
        readiness,
        consentStatuses,
        message: portfolio
          ? getBorrowerVerificationMessage(borrowerVerification)
          : "Save your business profile before submitting an application.",
      };
    }

    const applicationIds = data.map((application) => application.id);
    const [offersResult, activeLoansResult] = await Promise.all([
      supabase
        .from("loan_offers")
        .select(
          "id, loan_application_id, borrower_id, lender_id, lender_name, approved_amount, repayment_amount, fees, due_date, remarks, status, sent_at, repayment_channel, repayment_account_name, repayment_account_number, repayment_instructions, created_at, updated_at",
        )
        .in("loan_application_id", applicationIds)
        .order("sent_at", { ascending: false }),
      loadBorrowerActiveLoans(access),
    ]);
    const { data: offers, error: offersError } = offersResult;

    if (offersError) {
      return {
        ok: false,
        mode: "supabase",
        applications: [],
        hasPortfolio: Boolean(portfolio),
        borrowerVerification,
        creditSummary,
        readiness,
        consentStatuses,
        message: "Could not load offers.",
      };
    }

    if (!activeLoansResult.ok) {
      return {
        ok: false,
        mode: activeLoansResult.mode,
        applications: [],
        hasPortfolio: Boolean(portfolio),
        borrowerVerification,
        creditSummary,
        readiness,
        consentStatuses,
        message: activeLoansResult.message,
      };
    }

    const offersByApplicationId = new Map<string, LoanOfferSummary[]>();

    offers.forEach((offer) => {
      const mappedOffer = mapLoanOfferRow(offer);
      const currentOffers =
        offersByApplicationId.get(mappedOffer.applicationId) ?? [];

      offersByApplicationId.set(mappedOffer.applicationId, [
        ...currentOffers,
        mappedOffer,
      ]);
    });
    const activeLoansByApplicationId = new Map(
      activeLoansResult.loans.map((loan) => [loan.applicationId, loan]),
    );

    return {
      ok: true,
      mode: "supabase",
      applications: data.map((application) => {
        const mappedApplication = mapLoanApplicationRow(application);

        return {
          ...mappedApplication,
          offers: offersByApplicationId.get(mappedApplication.id) ?? [],
          activeLoan: activeLoansByApplicationId.get(mappedApplication.id) ?? null,
        };
      }),
      hasPortfolio: Boolean(portfolio),
      borrowerVerification,
      creditSummary,
      readiness,
      consentStatuses,
      message: portfolio
        ? getBorrowerVerificationMessage(borrowerVerification)
        : "Save your business profile before submitting an application.",
    };
  } catch {
    return {
      ok: false,
      mode: "auth",
      applications: [],
      hasPortfolio: false,
      borrowerVerification: null,
      creditSummary: null,
      readiness: null,
      consentStatuses: null,
      message: "Sign in to continue.",
    };
  }
}

async function loadBorrowerCreditSummary(
  borrowerId: string,
  portfolio: {
    monthly_gross_revenue: number | null;
    monthly_expenses: number | null;
    existing_loan_payments: number | null;
    years_in_operation: number | null;
    monthly_rent_or_mortgage?: number | null;
    monthly_electricity_bill?: number | null;
    monthly_water_bill?: number | null;
    monthly_internet_phone_bill?: number | null;
    monthly_food_groceries?: number | null;
    monthly_transportation?: number | null;
    monthly_tuition_education?: number | null;
    monthly_medical_expenses?: number | null;
    monthly_insurance?: number | null;
    monthly_family_support?: number | null;
    other_household_expenses?: number | null;
  },
  verifiedClient?: Awaited<ReturnType<typeof createSupabaseServerClient>>,
) {
  const supabase = verifiedClient ?? (await createSupabaseServerClient());
  const [{ data: activeLoans, error: loansError }, { data: pendingApps, error: appsError }] =
    await Promise.all([
      supabase
        .from("active_loans")
        .select("outstanding_balance, status")
        .eq("borrower_id", borrowerId)
        .gt("outstanding_balance", 0),
      supabase
        .from("loan_applications")
        .select("requested_amount")
        .eq("borrower_id", borrowerId)
        .in("status", ["submitted", "open"]),
    ]);

  if (loansError) {
    return null;
  }

  return calculateBorrowerAvailableCredit({
    portfolio: {
      monthlyGrossRevenue: portfolio.monthly_gross_revenue ?? 0,
      monthlyExpenses: portfolio.monthly_expenses ?? 0,
      existingLoanPayments: portfolio.existing_loan_payments ?? 0,
      yearsInOperation: portfolio.years_in_operation ?? 0,
      totalHouseholdExpenses: [
        portfolio.monthly_rent_or_mortgage,
        portfolio.monthly_electricity_bill,
        portfolio.monthly_water_bill,
        portfolio.monthly_internet_phone_bill,
        portfolio.monthly_food_groceries,
        portfolio.monthly_transportation,
        portfolio.monthly_tuition_education,
        portfolio.monthly_medical_expenses,
        portfolio.monthly_insurance,
        portfolio.monthly_family_support,
        portfolio.other_household_expenses,
      ].reduce<number>((total, value) => total + (Number(value) || 0), 0),
    },
    activeLoans: activeLoans.map((loan) => ({
      outstandingBalance: loan.outstanding_balance,
      status: loan.status,
    })),
    pendingApplicationAmounts: appsError
      ? []
      : (pendingApps ?? []).map((app) => app.requested_amount),
  });
}

export async function submitLoanApplication(
  values: LoanApplicationInput,
): Promise<LoanApplicationSubmitResult> {
  const parsed = loanApplicationSchema.safeParse(values);

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();

    return {
      ok: false,
      mode: "validation",
      message: "Review the highlighted fields before submitting.",
      fieldErrors,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireBorrower(supabase);

    if (!access.ok) {
      return {
        ok: false,
        mode: "auth",
        message: access.message,
      };
    }

    const { data, error } = await supabase
      .rpc("submit_loan_application", {
        p_requested_amount: parsed.data.requestedAmount,
        p_purpose: parsed.data.purpose,
        p_preferred_term: parsed.data.preferredTerm,
        p_remarks: parsed.data.remarks || "",
      });

    const result = data as
      | {
          ok?: boolean;
          code?: string;
          message?: string;
          application?: Json;
        }
      | null;

    if (error || !result?.ok || !isLoanApplicationRow(result.application)) {
      return {
        ok: false,
        mode:
          result?.code === "missing_portfolio" ||
          result?.code === "profile_required" ||
          result?.code === "profile_incomplete"
            ? "missing-portfolio"
            : result?.code === "consent_required"
              ? "consent-required"
            : result?.code === "borrower_verification_required"
              || result?.code === "documents_required"
              ? "borrower-verification"
            : result?.code === "account_not_active" ||
                result?.code === "suspended"
              ? "auth"
            : result?.code === "credit_limit_exceeded"
              ? "credit-limit"
            : result?.code === "active_application"
              ? "active-application"
            : result?.code === "profile_needs_review" ||
                result?.code === "profile_stale" ||
                result?.code === "not_eligible"
              ? "readiness"
              : "supabase",
        message: result?.message ?? "Could not submit application.",
      };
    }

    revalidatePath("/borrower");
    revalidatePath("/lender");
    revalidatePath("/lender/applications");

    return {
      ok: true,
      mode: "supabase",
      application: mapLoanApplicationRow(result.application),
      message: result.message ?? "Application submitted.",
    };
  } catch {
    return {
      ok: false,
      mode: "auth",
      message: "Sign in to continue.",
    };
  }
}

export async function updateLoanApplication(
  applicationId: string,
  values: LoanApplicationInput,
): Promise<LoanApplicationUpdateResult> {
  const parsed = loanApplicationSchema.safeParse(values);

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();

    return {
      ok: false,
      mode: "validation",
      message: "Review the highlighted fields before saving.",
      fieldErrors,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireBorrower(supabase);

    if (!access.ok) {
      return {
        ok: false,
        mode: "auth",
        message: access.message,
      };
    }

    const { data, error } = await supabase.rpc("update_loan_application", {
      p_application_id: applicationId,
      p_requested_amount: parsed.data.requestedAmount,
      p_purpose: parsed.data.purpose,
      p_preferred_term: parsed.data.preferredTerm,
      p_remarks: parsed.data.remarks || "",
    });

    const result = data as
      | {
          ok?: boolean;
          message?: string;
          application?: Json;
        }
      | null;

    if (error || !result?.ok || !isLoanApplicationRow(result.application)) {
      return {
        ok: false,
        mode: "supabase",
        message: result?.message ?? "Could not save changes.",
      };
    }

    revalidatePath("/borrower");
    revalidatePath(`/lender/applications/${applicationId}`);

    return {
      ok: true,
      application: mapLoanApplicationRow(result.application),
      message: result.message ?? "Application updated.",
    };
  } catch {
    return {
      ok: false,
      mode: "auth",
      message: "Sign in to continue.",
    };
  }
}

export async function withdrawLoanApplication(
  applicationId: string,
): Promise<LoanApplicationWithdrawResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireBorrower(supabase);

    if (!access.ok) {
      return {
        ok: false,
        message: access.message,
      };
    }

    const { data, error } = await supabase.rpc("withdraw_loan_application", {
      p_application_id: applicationId,
    });

    const result = data as
      | {
          ok?: boolean;
          message?: string;
          application?: Json;
        }
      | null;

    if (error || !result?.ok || !isLoanApplicationRow(result.application)) {
      return {
        ok: false,
        message: result?.message ?? "Could not withdraw application.",
      };
    }

    revalidatePath("/borrower");
    revalidatePath(`/lender/applications/${applicationId}`);

    return {
      ok: true,
      application: mapLoanApplicationRow(result.application),
      message: result.message ?? "Application withdrawn.",
    };
  } catch {
    return {
      ok: false,
      message: "Could not withdraw application.",
    };
  }
}

export async function acceptLoanOffer(
  offerId: string,
): Promise<LoanOfferAcceptResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireBorrower(supabase);

    if (!access.ok) {
      return {
        ok: false,
        message: access.message,
      };
    }

    const { data, error } = await supabase.rpc("accept_loan_offer", {
      p_offer_id: offerId,
    });

    const result = data as
      | {
          ok?: boolean;
          message?: string;
          loan_application_id?: string;
          active_loan_id?: string;
        }
      | null;

    if (error || !result?.ok) {
      return {
        ok: false,
        message: result?.message ?? "Could not accept offer.",
      };
    }

    revalidatePath("/borrower");
    if (result.loan_application_id) {
      revalidatePath(`/lender/applications/${result.loan_application_id}`);
    }

    return {
      ok: true,
      message: result.message ?? "Offer accepted.",
      activeLoanId: result.active_loan_id ?? null,
    };
  } catch {
    return {
      ok: false,
      message: "Could not accept offer.",
    };
  }
}

export async function declineLoanOffer(
  offerId: string,
): Promise<LoanOfferDeclineResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireBorrower(supabase);

    if (!access.ok) {
      return {
        ok: false,
        message: access.message,
      };
    }

    const { data, error } = await supabase.rpc("decline_loan_offer", {
      p_offer_id: offerId,
    });

    const result = data as
      | {
          ok?: boolean;
          message?: string;
          loan_application_id?: string;
        }
      | null;

    if (error || !result?.ok) {
      return {
        ok: false,
        message: result?.message ?? "Could not decline offer.",
      };
    }

    revalidatePath("/borrower");
    if (result.loan_application_id) {
      revalidatePath(`/lender/applications/${result.loan_application_id}`);
    }

    return {
      ok: true,
      message: result.message ?? "Offer declined.",
    };
  } catch {
    return {
      ok: false,
      message: "Could not decline offer.",
    };
  }
}

export async function submitRepaymentProof(
  _previousState: RepaymentProofSubmitResult | null,
  formData: FormData,
): Promise<RepaymentProofSubmitResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireBorrower(supabase);

    if (!access.ok) {
      return {
        ok: false,
        message: access.message,
      };
    }

    const repaymentScheduleId = formData.get("repaymentScheduleId");

    if (typeof repaymentScheduleId !== "string" || repaymentScheduleId.length === 0) {
      return {
        ok: false,
        message: "Missing repayment reference.",
      };
    }

    const proofFile = formData.get("proofFile");

    if (!(proofFile instanceof File) || proofFile.size === 0) {
      return {
        ok: false,
        message: "Choose a proof file to upload.",
      };
    }

    if (!repaymentProofAllowedTypes.has(proofFile.type)) {
      return {
        ok: false,
        message: "Upload a JPG, PNG, WebP, HEIC, or PDF file.",
      };
    }

    if (proofFile.size > repaymentProofMaxFileSize) {
      return {
        ok: false,
        message: "Upload a file up to 5 MB.",
      };
    }

    const { data: repayment, error: repaymentError } = await supabase
      .from("loan_repayment_schedules")
      .select("id, active_loan_id, borrower_id, lender_id, status")
      .eq("id", repaymentScheduleId)
      .eq("borrower_id", access.profile.id)
      .maybeSingle();

    if (repaymentError || !repayment) {
      return {
        ok: false,
        message: "Could not find this repayment.",
      };
    }

    if (repayment.status === "verified") {
      return {
        ok: false,
        message: "This repayment is already verified.",
      };
    }

    if (repayment.status === "submitted") {
      return {
        ok: false,
        message: "A proof is already waiting for lender review.",
      };
    }

    const { data: activeLoan, error: activeLoanError } = await supabase
      .from("active_loans")
      .select("id, status")
      .eq("id", repayment.active_loan_id)
      .eq("borrower_id", access.profile.id)
      .maybeSingle();

    if (
      activeLoanError ||
      !activeLoan ||
      !["active", "overdue"].includes(activeLoan.status)
    ) {
      return {
        ok: false,
        message: "This loan is not active.",
      };
    }

    const safeFileName = createSafeProofFileName(proofFile.name);
    const storagePath = [
      "borrowers",
      access.profile.id,
      "loans",
      repayment.active_loan_id,
      "repayments",
      repayment.id,
      `${Date.now()}-${safeFileName}`,
    ].join("/");

    const { error: uploadError } = await supabase.storage
      .from(repaymentProofBucket)
      .upload(storagePath, proofFile, {
        contentType: proofFile.type,
        upsert: false,
      });

    if (uploadError) {
      return {
        ok: false,
        message: "Could not upload proof.",
      };
    }

    const { data, error } = await supabase.rpc("submit_repayment_proof", {
      p_repayment_schedule_id: repayment.id,
      p_storage_path: storagePath,
      p_file_name: proofFile.name,
      p_file_type: proofFile.type,
      p_file_size: proofFile.size,
    });

    const result = data as
      | {
          ok?: boolean;
          message?: string;
          proof_id?: string;
        }
      | null;

    if (error || !result?.ok || !result.proof_id) {
      await supabase.storage.from(repaymentProofBucket).remove([storagePath]);

      return {
        ok: false,
        message: result?.message ?? "Could not submit proof.",
      };
    }

    revalidatePath("/borrower");
    revalidatePath("/lender");
    revalidatePath("/lender/applications");

    return {
      ok: true,
      message: result.message ?? "Proof submitted for lender review.",
      proofId: result.proof_id,
    };
  } catch {
    return {
      ok: false,
      message: "Could not submit proof.",
    };
  }
}

export async function submitBorrowerVerificationDocument(
  _previousState: BorrowerVerificationDocumentSubmitResult | null,
  formData: FormData,
): Promise<BorrowerVerificationDocumentSubmitResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireBorrower(supabase);

    if (!access.ok) {
      return {
        ok: false,
        message: access.message,
      };
    }

    const userConsents = await loadUserConsents(supabase, access.profile.id);

    if (
      !hasCurrentRequiredConsents(
        userConsents,
        getRequiredConsentVersions("borrower_document_upload"),
      )
    ) {
      return {
        ok: false,
        code: "consent_required",
        message:
          "Accept the required disclosures before uploading verification documents.",
      };
    }

    const documentType = formData.get("documentType");
    const documentFile =
      formData.get("documentFile") ?? formData.get("proofFile");

    if (!isBorrowerVerificationDocumentType(documentType)) {
      return {
        ok: false,
        message: "Choose a verification document type.",
      };
    }

    if (!(documentFile instanceof File) || documentFile.size === 0) {
      return {
        ok: false,
        message: "Choose a verification document to upload.",
      };
    }

    if (!borrowerVerificationDocumentAllowedTypes.has(documentFile.type)) {
      return {
        ok: false,
        message: "Upload a JPG, PNG, WebP, or PDF file.",
      };
    }

    if (documentFile.size > borrowerVerificationDocumentMaxFileSize) {
      return {
        ok: false,
        message: "Upload a file up to 5 MB.",
      };
    }

    const { data: verification, error: verificationError } = await supabase
      .from("borrower_verifications")
      .select("id, borrower_id, verification_status")
      .eq("borrower_id", access.profile.id)
      .maybeSingle();

    if (verificationError || !verification) {
      return {
        ok: false,
        message: "Borrower verification is unavailable.",
      };
    }

    if (verification.verification_status === "approved") {
      return {
        ok: false,
        message: "This borrower verification is already approved.",
      };
    }

    if (
      ![
        "not_started",
        "pending",
        "pending_documents",
        "rejected",
        "needs_resubmission",
      ].includes(verification.verification_status)
    ) {
      return {
        ok: false,
        message: "Could not upload verification document.",
      };
    }

    const safeFileName = createSafeUploadFileName(
      documentFile.name,
      "verification-document",
    );
    const storagePath = [
      "borrowers",
      access.profile.id,
      "verification",
      verification.id,
      `${Date.now()}-${safeFileName}`,
    ].join("/");

    const { error: uploadError } = await supabase.storage
      .from(borrowerVerificationDocumentBucket)
      .upload(storagePath, documentFile, {
        contentType: documentFile.type,
        upsert: false,
      });

    if (uploadError) {
      return {
        ok: false,
        message: "Could not upload verification document.",
      };
    }

    const { data, error } = await supabase.rpc(
      "submit_borrower_verification_document",
      {
        p_borrower_verification_id: verification.id,
        p_storage_path: storagePath,
        p_document_type: documentType,
        p_file_name: documentFile.name,
        p_file_type: documentFile.type,
        p_file_size: documentFile.size,
      },
    );

    const result = data as
      | {
          ok?: boolean;
          code?: string;
          message?: string;
          document_id?: string;
        }
      | null;

    if (error || !result?.ok || !result.document_id) {
      await supabase.storage
        .from(borrowerVerificationDocumentBucket)
        .remove([storagePath]);

      return {
        ok: false,
        code:
          result?.code === "consent_required" ? "consent_required" : undefined,
        message: result?.message ?? "Could not save verification document.",
      };
    }

    revalidatePath("/borrower");
    revalidatePath("/manager");
    revalidatePath("/manager/borrower-verifications");

    return {
      ok: true,
      message: result.message ?? "Verification document uploaded.",
      documentId: result.document_id,
    };
  } catch {
    return {
      ok: false,
      message: "Could not upload verification document.",
    };
  }
}

function isLoanApplicationRow(value: Json | undefined): value is Parameters<
  typeof mapLoanApplicationRow
>[0] {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      "id" in value &&
      "borrower_id" in value &&
      "borrower_portfolio_id" in value &&
      "requested_amount" in value &&
      "purpose" in value &&
      "preferred_term" in value &&
      "status" in value &&
      "submitted_at" in value,
  );
}

function createSafeProofFileName(fileName: string) {
  return createSafeUploadFileName(fileName, "repayment-proof");
}
