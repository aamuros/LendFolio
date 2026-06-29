import { z } from "zod";
import { fullNameSchema } from "@/lib/signup";

const requiredConsentCheckbox = (message: string) =>
  z.preprocess(
    (value) => value === true || value === "on",
    z.literal(true, { error: message }),
  );

export const lenderRegisterSchema = z
  .object({
    displayName: fullNameSchema,
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email address."),
    organizationName: z
      .string()
      .trim()
      .min(2, "Enter your company name.")
      .max(160, "Company name must be 160 characters or fewer."),
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
  });

export type LenderRegisterInput = z.infer<typeof lenderRegisterSchema>;
