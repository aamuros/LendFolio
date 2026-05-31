import { z } from "zod";

export const typicalRepaymentTermOptions = [
  "1 month",
  "1 to 3 months",
  "1 to 6 months",
  "3 to 6 months",
  "3 to 12 months",
  "6 to 12 months",
  "1 to 12 months",
] as const;

const requiredConsentCheckbox = (message: string) =>
  z.preprocess(
    (value) => value === true || value === "on",
    z.literal(true, { error: message }),
  );

export const lenderOnboardingSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(2, "Organization name must be at least 2 characters.")
    .max(160, "Organization name must be 160 characters or fewer."),
  contactPerson: z
    .string()
    .trim()
    .min(2, "Contact person must be at least 2 characters.")
    .max(120, "Contact person must be 120 characters or fewer."),
  phoneNumber: z
    .string()
    .trim()
    .min(7, "Phone number must be at least 7 characters.")
    .max(30, "Phone number must be 30 characters or fewer."),
  businessAddress: z
    .string()
    .trim()
    .min(5, "Business address must be at least 5 characters.")
    .max(240, "Business address must be 240 characters or fewer."),
  operatingArea: z
    .string()
    .trim()
    .min(2, "Operating area must be at least 2 characters.")
    .max(160, "Operating area must be 160 characters or fewer."),
  businessRegistrationNumber: z
    .string()
    .trim()
    .max(80, "Registration number must be 80 characters or fewer.")
    .optional()
    .or(z.literal("")),
  minLoanAmount: z
    .string()
    .min(1, "Enter the minimum loan amount.")
    .transform((val) => {
      const num = Number(val.replace(/[^0-9.-]/g, ""));
      return num;
    })
    .pipe(
      z
        .number()
        .positive("Minimum loan amount must be greater than zero.")
        .max(999_999_999.99, "Minimum loan amount is too large."),
    ),
  maxLoanAmount: z
    .string()
    .min(1, "Enter the maximum loan amount.")
    .transform((val) => {
      const num = Number(val.replace(/[^0-9.-]/g, ""));
      return num;
    })
    .pipe(
      z
        .number()
        .positive("Maximum loan amount must be greater than zero.")
        .max(999_999_999.99, "Maximum loan amount is too large."),
    ),
  typicalRepaymentTerms: z.enum(typicalRepaymentTermOptions, {
    error: "Select your typical repayment terms.",
  }),
  lenderDescription: z
    .string()
    .trim()
    .min(20, "Lender description must be at least 20 characters.")
    .max(800, "Lender description must be 800 characters or fewer."),
  lenderReviewConsentAccepted: requiredConsentCheckbox(
    "Accept the required lender-review disclosures before submitting.",
  ),
}).superRefine((value, context) => {
  if (value.maxLoanAmount < value.minLoanAmount) {
    context.addIssue({
      code: "custom",
      path: ["maxLoanAmount"],
      message: "Maximum loan amount must be greater than or equal to minimum.",
    });
  }
});

export type LenderOnboardingInput = z.infer<typeof lenderOnboardingSchema>;
