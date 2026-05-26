import { z } from "zod";

export const signupRoles = ["borrower", "lender"] as const;

export type SignupRole = (typeof signupRoles)[number];

const optionalTextInput = (schema: z.ZodType<string | undefined>) =>
  z.preprocess(
    (value) => (value === null || value === "" ? undefined : value),
    schema,
  );

const moneyInput = z.preprocess(
  (value) => (value === null || value === "" ? undefined : Number(value)),
  z
    .number({
      error: "Enter a valid amount.",
    })
    .positive("Amount must be greater than 0.")
    .optional(),
);

const requiredConsentCheckbox = (message: string) =>
  z.preprocess(
    (value) => value === true || value === "on",
    z.literal(true, { error: message }),
  );

export const signupSchema = z
  .object({
    role: z.enum(signupRoles, {
      error: "Choose borrower or lender.",
    }),
    displayName: z
      .string()
      .trim()
      .min(2, "Enter your full name.")
      .max(120, "Name must be 120 characters or fewer."),
    organizationName: optionalTextInput(
      z
        .string()
        .trim()
        .max(160, "Organization name must be 160 characters or fewer.")
        .optional(),
    ),
    contactPerson: optionalTextInput(
      z
        .string()
        .trim()
        .min(2, "Enter a contact person.")
        .max(120, "Contact person must be 120 characters or fewer.")
        .optional(),
    ),
    phoneNumber: optionalTextInput(
      z
        .string()
        .trim()
        .min(7, "Enter a valid phone number.")
        .max(30, "Phone number must be 30 characters or fewer.")
        .optional(),
    ),
    businessAddress: optionalTextInput(
      z
        .string()
        .trim()
        .min(5, "Enter a business address.")
        .max(240, "Business address must be 240 characters or fewer.")
        .optional(),
    ),
    operatingArea: optionalTextInput(
      z
        .string()
        .trim()
        .min(2, "Enter an operating area.")
        .max(160, "Operating area must be 160 characters or fewer.")
        .optional(),
    ),
    businessRegistrationNumber: optionalTextInput(
      z
        .string()
        .trim()
        .min(2, "Registration number must be at least 2 characters.")
        .max(80, "Registration number must be 80 characters or fewer.")
        .optional(),
    ),
    minLoanAmount: moneyInput,
    maxLoanAmount: moneyInput,
    typicalRepaymentTerms: optionalTextInput(
      z
        .string()
        .trim()
        .min(2, "Enter typical repayment terms.")
        .max(240, "Repayment terms must be 240 characters or fewer.")
        .optional(),
    ),
    lenderDescription: optionalTextInput(
      z
        .string()
        .trim()
        .min(20, "Describe your lending activity in at least 20 characters.")
        .max(800, "Description must be 800 characters or fewer.")
        .optional(),
    ),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email address."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(72, "Password must be 72 characters or fewer."),
    confirmPassword: z.string(),
    termsAccepted: requiredConsentCheckbox("Accept the Terms of Service."),
    privacyAccepted: requiredConsentCheckbox("Acknowledge the Privacy Notice."),
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords must match.",
      });
    }

    if (
      value.role === "lender" &&
      (!value.organizationName || value.organizationName.length < 2)
    ) {
      context.addIssue({
        code: "custom",
        path: ["organizationName"],
        message: "Enter your organization name.",
      });
    }

    if (value.role === "lender") {
      const requiredLenderFields: Array<keyof typeof value> = [
        "contactPerson",
        "phoneNumber",
        "businessAddress",
        "operatingArea",
        "minLoanAmount",
        "maxLoanAmount",
        "typicalRepaymentTerms",
        "lenderDescription",
      ];

      for (const field of requiredLenderFields) {
        if (value[field] === undefined) {
          context.addIssue({
            code: "custom",
            path: [field],
            message: "This field is required for lender review.",
          });
        }
      }

      if (
        value.minLoanAmount !== undefined &&
        value.maxLoanAmount !== undefined &&
        value.maxLoanAmount < value.minLoanAmount
      ) {
        context.addIssue({
          code: "custom",
          path: ["maxLoanAmount"],
          message: "Maximum loan amount must be at least the minimum amount.",
        });
      }
    }
  });

export type SignupInput = z.infer<typeof signupSchema>;
