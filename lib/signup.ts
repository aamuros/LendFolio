import { z } from "zod";

export const signupRoles = ["borrower", "lender"] as const;

export type SignupRole = (typeof signupRoles)[number];

const requiredConsentCheckbox = (message: string) =>
  z.preprocess(
    (value) => value === true || value === "on",
    z.literal(true, { error: message }),
  );

export const fullNameInputPattern = "[A-Za-zÀ-ÖØ-öø-ÿÑñ]+(?:[ .'’-][A-Za-zÀ-ÖØ-öø-ÿÑñ]+)+";

const fullNamePattern = new RegExp(`^${fullNameInputPattern}$`, "u");

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Enter your full name.")
  .max(120, "Name must be 120 characters or fewer.")
  .regex(
    fullNamePattern,
    "Enter your first and last name using letters only.",
  );

export const signupSchema = z
  .object({
    role: z.enum(signupRoles, {
      error: "Choose borrower or lender.",
    }),
    displayName: fullNameSchema,
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
  });

export type SignupInput = z.infer<typeof signupSchema>;
