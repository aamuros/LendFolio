import type {
  BorrowerReadinessResult,
  BorrowerReadinessStatus,
} from "@/lib/borrower-readiness";

export type BorrowerCreditProfileGrade =
  | "A"
  | "B"
  | "C"
  | "review_needed"
  | "not_eligible"
  | "incomplete";

export type BorrowerCreditProfileAssessment = {
  grade: BorrowerCreditProfileGrade;
  label: string;
  summary: string;
  positiveFactors: string[];
  riskFactors: string[];
  improvementActions: string[];
  inputs: {
    readinessStatus: BorrowerReadinessStatus;
    monthlyNetCashFlow: number;
    debtBurdenRatio: number | null;
    availableCredit: number;
    calculatedCreditLimit: number;
    usedCredit: number;
    yearsInOperation?: number;
    revenueConfidence?: string | null;
    verificationStatus?: string | null;
    profileIsStale?: boolean;
  };
};

export type CreditProfileGradeInput = {
  readiness: BorrowerReadinessResult;
  availableCredit: number;
  calculatedCreditLimit: number;
  usedCredit: number;
  yearsInOperation?: number;
  revenueConfidence?: string | null;
  verificationStatus?: string | null;
};

const gradeLabels: Record<BorrowerCreditProfileGrade, string> = {
  A: "Strong profile",
  B: "Acceptable profile",
  C: "Review recommended",
  review_needed: "Review needed",
  not_eligible: "Not eligible",
  incomplete: "Incomplete profile",
};

const gradeSummaries: Record<BorrowerCreditProfileGrade, string> = {
  A: "This borrower has a strong profile with positive cash flow, low debt burden, and verified information.",
  B: "This borrower has an acceptable profile with minor risk signals. Review risk notes before offering.",
  C: "This borrower is eligible but has notable risk signals. Careful review is recommended.",
  review_needed:
    "This profile requires additional review or borrower action before an offer decision.",
  not_eligible:
    "A hard blocker prevents this borrower from entering the offer workflow.",
  incomplete:
    "Required profile or verification information is missing.",
};

export function evaluateBorrowerCreditProfileGrade(
  input: CreditProfileGradeInput,
): BorrowerCreditProfileAssessment {
  const {
    readiness,
    availableCredit,
    calculatedCreditLimit,
    usedCredit,
    yearsInOperation,
    revenueConfidence,
    verificationStatus,
  } = input;

  const baseInputs = {
    readinessStatus: readiness.readinessStatus,
    monthlyNetCashFlow: readiness.monthlyNetCashFlow,
    debtBurdenRatio: readiness.debtBurdenRatio,
    availableCredit,
    calculatedCreditLimit,
    usedCredit,
    yearsInOperation,
    revenueConfidence,
    verificationStatus,
    profileIsStale: readiness.profileIsStale,
  };

  if (readiness.readinessStatus === "incomplete") {
    return {
      grade: "incomplete",
      label: gradeLabels.incomplete,
      summary: gradeSummaries.incomplete,
      positiveFactors: [],
      riskFactors: [
        "Required profile or verification information is missing.",
      ],
      improvementActions: readiness.nextActions,
      inputs: baseInputs,
    };
  }

  if (
    readiness.readinessStatus === "not_eligible" ||
    availableCredit <= 0
  ) {
    return {
      grade: "not_eligible",
      label: gradeLabels.not_eligible,
      summary: gradeSummaries.not_eligible,
      positiveFactors: [],
      riskFactors: buildNotEligibleRiskFactors(readiness, availableCredit),
      improvementActions: readiness.nextActions,
      inputs: baseInputs,
    };
  }

  if (readiness.readinessStatus === "needs_review") {
    return buildReviewNeededAssessment(readiness, baseInputs);
  }

  if (readiness.readinessStatus === "complete") {
    return buildReviewNeededAssessment(readiness, baseInputs);
  }

  return buildEligibleAssessment(
    readiness,
    baseInputs,
    availableCredit,
    calculatedCreditLimit,
    usedCredit,
    yearsInOperation,
    revenueConfidence,
    verificationStatus,
  );
}

function buildNotEligibleRiskFactors(
  readiness: BorrowerReadinessResult,
  availableCredit: number,
): string[] {
  const factors: string[] = [];

  if (availableCredit <= 0) {
    factors.push("No available credit remaining.");
  }

  if (readiness.monthlyNetCashFlow <= 0) {
    factors.push("Monthly net cash flow is not positive.");
  }

  for (const flag of readiness.riskFlags) {
    if (flag === "expenses_exceed_revenue") {
      factors.push("Monthly expenses exceed revenue.");
    } else if (flag === "zero_revenue") {
      factors.push("No revenue recorded.");
    } else if (flag === "suspended") {
      factors.push("Account is suspended.");
    } else if (flag === "account_not_active") {
      factors.push("Account is not active.");
    } else if (flag === "high_debt_burden") {
      factors.push("Debt burden ratio is high.");
    }
  }

  return factors;
}

function buildReviewNeededAssessment(
  readiness: BorrowerReadinessResult,
  baseInputs: BorrowerCreditProfileAssessment["inputs"],
): BorrowerCreditProfileAssessment {
  const positiveFactors: string[] = [];
  const riskFactors: string[] = [];

  if (readiness.monthlyNetCashFlow > 0) {
    positiveFactors.push("Monthly net cash flow is positive.");
  }

  if (
    readiness.debtBurdenRatio !== null &&
    readiness.debtBurdenRatio < 0.3
  ) {
    positiveFactors.push("Debt burden ratio is manageable.");
  }

  for (const flag of readiness.riskFlags) {
    riskFactors.push(formatRiskFlag(flag));
  }

  if (readiness.profileIsStale) {
    riskFactors.push("Profile has not been confirmed recently.");
  }

  return {
    grade: "review_needed",
    label: gradeLabels.review_needed,
    summary: gradeSummaries.review_needed,
    positiveFactors,
    riskFactors,
    improvementActions: readiness.nextActions,
    inputs: baseInputs,
  };
}

function buildEligibleAssessment(
  readiness: BorrowerReadinessResult,
  baseInputs: BorrowerCreditProfileAssessment["inputs"],
  availableCredit: number,
  calculatedCreditLimit: number,
  usedCredit: number,
  yearsInOperation: number | undefined,
  revenueConfidence: string | null | undefined,
  verificationStatus: string | null | undefined,
): BorrowerCreditProfileAssessment {
  const positiveFactors: string[] = [];
  const riskFactors: string[] = [];
  const improvementActions: string[] = [];
  let deductions = 0;

  if (readiness.monthlyNetCashFlow > 0) {
    positiveFactors.push("Positive monthly net cash flow.");
  }

  if (
    readiness.debtBurdenRatio !== null &&
    readiness.debtBurdenRatio < 0.2
  ) {
    positiveFactors.push("Low debt burden ratio.");
  } else if (
    readiness.debtBurdenRatio !== null &&
    readiness.debtBurdenRatio < 0.3
  ) {
    positiveFactors.push("Manageable debt burden ratio.");
  }

  if (verificationStatus === "approved") {
    positiveFactors.push("Borrower verification approved.");
  }

  if (
    revenueConfidence === "document_supported" ||
    revenueConfidence === "manager_reviewed"
  ) {
    positiveFactors.push("Revenue is document-supported or manager-reviewed.");
  }

  if (yearsInOperation !== undefined && yearsInOperation >= 2) {
    positiveFactors.push("Established business with 2+ years in operation.");
  }

  if (availableCredit > 0 && calculatedCreditLimit > 0) {
    const creditUtilization = usedCredit / calculatedCreditLimit;

    if (creditUtilization < 0.5) {
      positiveFactors.push("Low credit utilization.");
    }
  }

  if (
    readiness.debtBurdenRatio !== null &&
    readiness.debtBurdenRatio >= 0.3
  ) {
    deductions++;
    riskFactors.push("Debt burden ratio is moderate to high.");
    improvementActions.push(
      "Reduce existing loan payments to improve your profile.",
    );
  }

  if (yearsInOperation !== undefined && yearsInOperation < 0.5) {
    deductions++;
    riskFactors.push("Business is very new (under 6 months).");
  } else if (yearsInOperation !== undefined && yearsInOperation < 1) {
    deductions++;
    riskFactors.push("Business is relatively new (under 1 year).");
  }

  if (
    revenueConfidence === "self_declared" ||
    !revenueConfidence
  ) {
    deductions++;
    riskFactors.push("Revenue is self-declared and not document-supported.");
    improvementActions.push(
      "Upload supporting documents to strengthen your revenue claims.",
    );
  }

  if (
    readiness.monthlyNetCashFlow > 0 &&
    baseInputs.monthlyNetCashFlow < 10000
  ) {
    deductions++;
    riskFactors.push("Net monthly cash flow is relatively low.");
  }

  if (availableCredit > 0 && calculatedCreditLimit > 0) {
    const creditUtilization = usedCredit / calculatedCreditLimit;

    if (creditUtilization >= 0.7) {
      deductions++;
      riskFactors.push(
        "Used credit is consuming most of the available credit limit.",
      );
    }
  }

  if (readiness.profileIsStale) {
    deductions++;
    riskFactors.push("Profile has not been confirmed recently.");
    improvementActions.push("Confirm your profile details to keep them current.");
  }

  for (const flag of readiness.riskFlags) {
    if (flag === "high_debt_burden") {
      if (!riskFactors.some((f) => f.includes("Debt burden"))) {
        deductions++;
        riskFactors.push("Debt burden ratio is high.");
      }
    }
    if (flag === "very_new_business") {
      if (!riskFactors.some((f) => f.includes("new"))) {
        deductions++;
        riskFactors.push("Business is very new.");
      }
    }
  }

  let grade: BorrowerCreditProfileGrade;

  if (deductions === 0) {
    grade = "A";
  } else if (deductions <= 1) {
    grade = "B";
  } else {
    grade = "C";
  }

  return {
    grade,
    label: gradeLabels[grade],
    summary: gradeSummaries[grade],
    positiveFactors,
    riskFactors,
    improvementActions,
    inputs: baseInputs,
  };
}

export function getCreditProfileGradeLabel(
  grade: BorrowerCreditProfileGrade,
): string {
  return gradeLabels[grade];
}

export function getCreditProfileGradeSummary(
  grade: BorrowerCreditProfileGrade,
): string {
  return gradeSummaries[grade];
}

export function formatCreditProfileGrade(
  grade: BorrowerCreditProfileGrade,
): string {
  if (grade === "A" || grade === "B" || grade === "C") {
    return `Grade ${grade}`;
  }

  return grade
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

export function getGradeTone(
  grade: BorrowerCreditProfileGrade,
): "success" | "attention" | "danger" | "neutral" {
  switch (grade) {
    case "A":
      return "success";
    case "B":
      return "attention";
    case "C":
      return "danger";
    case "review_needed":
      return "attention";
    case "not_eligible":
      return "danger";
    case "incomplete":
      return "neutral";
  }
}

function formatRiskFlag(flag: string): string {
  const messages: Record<string, string> = {
    high_debt_burden: "Debt burden ratio is high.",
    high_existing_debt_payments: "Existing debt payments are high.",
    expenses_exceed_revenue: "Monthly expenses exceed revenue.",
    zero_revenue: "No revenue recorded.",
    very_new_business: "Business is very new.",
    non_positive_cash_flow: "Monthly net cash flow is not positive.",
    no_available_credit: "No available credit remaining.",
    suspended: "Account is suspended.",
    account_not_active: "Account is not active.",
  };

  return messages[flag] ?? `Risk flag: ${flag}.`;
}
