import { z } from "zod";
import {
  isValidPhilippineAddressSelection,
  formatPhilippineAddress,
  getRegionNameByCode,
} from "@/lib/philippine-addresses";
import type { PhilippineAddressSelection } from "@/lib/philippine-addresses";

export const philippineOperatingAreas = [
  "NCR - National Capital Region",
  "CAR - Cordillera Administrative Region",
  "Region I - Ilocos Region",
  "Region II - Cagayan Valley",
  "Region III - Central Luzon",
  "Region IV-A - CALABARZON",
  "Region IV-B - MIMAROPA",
  "Region V - Bicol Region",
  "Region VI - Western Visayas",
  "Region VII - Central Visayas",
  "Region VIII - Eastern Visayas",
  "Region IX - Zamboanga Peninsula",
  "Region X - Northern Mindanao",
  "Region XI - Davao Region",
  "Region XII - SOCCSKSARGEN",
  "Region XIII - Caraga",
  "BARMM - Bangsamoro Autonomous Region in Muslim Mindanao",
] as const;

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

const addressSelectionSchema = z
  .object({
    regionCode: z.string().min(1, "Select your region."),
    regionName: z.string().min(1),
    cityOrMunicipality: z.string().min(1, "Select your city or municipality."),
    barangay: z.string().min(1, "Select your barangay."),
    zipCode: z.string().min(1, "ZIP code is required."),
  })
  .superRefine((value, context) => {
    if (!isValidPhilippineAddressSelection(value)) {
      context.addIssue({
        code: "custom",
        path: ["regionCode"],
        message:
          "The selected region, city, barangay, and ZIP code combination is not valid.",
      });
    }
  });

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
  streetAddress: z
    .string()
    .trim()
    .max(240, "Street address must be 240 characters or fewer.")
    .optional()
    .or(z.literal("")),
  address: addressSelectionSchema,
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
    .max(800, "Lender description must be 800 characters or fewer.")
    .optional()
    .or(z.literal("")),
  lenderReviewConsentAccepted: requiredConsentCheckbox(
    "Accept the Authorization for Lender Verification before submitting.",
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

export type LenderOnboardingAddressFields = {
  businessAddress: string;
  operatingArea: string;
  addressRegion: string;
  addressCity: string;
  addressBarangay: string;
  addressZipCode: string;
};

export function resolveLenderOnboardingAddress(
  address: PhilippineAddressSelection,
  streetAddress?: string,
): LenderOnboardingAddressFields {
  const formatted = formatPhilippineAddress(address, streetAddress);
  const regionName = getRegionNameByCode(address.regionCode);

  return {
    businessAddress: formatted,
    operatingArea: regionName,
    addressRegion: address.regionCode,
    addressCity: address.cityOrMunicipality,
    addressBarangay: address.barangay,
    addressZipCode: address.zipCode,
  };
}
