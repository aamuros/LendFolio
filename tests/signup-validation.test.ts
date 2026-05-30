import { describe, expect, it } from "vitest";
import { signupSchema } from "../lib/signup";
import { lenderRegisterSchema } from "../lib/lender-register";
import { lenderOnboardingSchema } from "../lib/lender-onboarding";

describe("signup schema validation", () => {
  const validBorrowerInput = {
    role: "borrower",
    displayName: "Juan dela Cruz",
    email: "juan@example.com",
    password: "securepassword123",
    confirmPassword: "securepassword123",
    termsAccepted: true,
    privacyAccepted: true,
  };

  const validLenderInput = {
    ...validBorrowerInput,
    role: "lender",
  };

  it("accepts valid borrower signup input", () => {
    const result = signupSchema.safeParse(validBorrowerInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("borrower");
    }
  });

  it("accepts valid lender signup input", () => {
    const result = signupSchema.safeParse(validLenderInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("lender");
    }
  });

  it("rejects password mismatch with confirmPassword field error", () => {
    const result = signupSchema.safeParse({
      ...validBorrowerInput,
      confirmPassword: "differentpassword",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.confirmPassword).toBeDefined();
      expect(fieldErrors.confirmPassword).toContain("Passwords must match.");
    }
  });

  it("preserves other field data when password mismatch occurs", () => {
    const result = signupSchema.safeParse({
      ...validBorrowerInput,
      confirmPassword: "differentpassword",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      // Only confirmPassword should have an error, other fields valid
      expect(fieldErrors.role).toBeUndefined();
      expect(fieldErrors.displayName).toBeUndefined();
      expect(fieldErrors.email).toBeUndefined();
      expect(fieldErrors.password).toBeUndefined();
      expect(fieldErrors.termsAccepted).toBeUndefined();
      expect(fieldErrors.privacyAccepted).toBeUndefined();
    }
  });

  it("rejects missing role", () => {
    const result = signupSchema.safeParse({
      ...validBorrowerInput,
      role: undefined,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.role).toBeDefined();
    }
  });

  it("rejects invalid role value", () => {
    const result = signupSchema.safeParse({
      ...validBorrowerInput,
      role: "admin",
    });

    expect(result.success).toBe(false);
  });

  it("rejects unchecked terms of service", () => {
    const result = signupSchema.safeParse({
      ...validBorrowerInput,
      termsAccepted: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.termsAccepted).toBeDefined();
    }
  });

  it("rejects unchecked privacy notice", () => {
    const result = signupSchema.safeParse({
      ...validBorrowerInput,
      privacyAccepted: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.privacyAccepted).toBeDefined();
    }
  });

  it("accepts checkbox value 'on' as true for consent checkboxes", () => {
    const result = signupSchema.safeParse({
      ...validBorrowerInput,
      termsAccepted: "on",
      privacyAccepted: "on",
    });

    expect(result.success).toBe(true);
  });

  it("rejects short password", () => {
    const result = signupSchema.safeParse({
      ...validBorrowerInput,
      password: "short",
      confirmPassword: "short",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.password).toBeDefined();
    }
  });

  it("rejects short display name", () => {
    const result = signupSchema.safeParse({
      ...validBorrowerInput,
      displayName: "J",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.displayName).toBeDefined();
    }
  });

  it("rejects invalid email", () => {
    const result = signupSchema.safeParse({
      ...validBorrowerInput,
      email: "not-an-email",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.email).toBeDefined();
    }
  });

  it("preserves lender role through password mismatch validation", () => {
    const result = signupSchema.safeParse({
      ...validLenderInput,
      confirmPassword: "differentpassword",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.role).toBeUndefined();
      expect(fieldErrors.confirmPassword).toContain("Passwords must match.");
    }
  });

  it("parses lender role from hidden input FormData value", () => {
    const formData = new FormData();
    formData.set("role", "lender");
    formData.set("displayName", "Maria Santos");
    formData.set("email", "maria@lending.com");
    formData.set("password", "securepass123");
    formData.set("confirmPassword", "securepass123");
    formData.set("termsAccepted", "on");
    formData.set("privacyAccepted", "on");

    const result = signupSchema.safeParse({
      role: formData.get("role"),
      displayName: formData.get("displayName"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
      termsAccepted: formData.get("termsAccepted"),
      privacyAccepted: formData.get("privacyAccepted"),
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("lender");
    }
  });

  it("parses borrower role from hidden input FormData value", () => {
    const formData = new FormData();
    formData.set("role", "borrower");
    formData.set("displayName", "Juan dela Cruz");
    formData.set("email", "juan@example.com");
    formData.set("password", "securepass123");
    formData.set("confirmPassword", "securepass123");
    formData.set("termsAccepted", "on");
    formData.set("privacyAccepted", "on");

    const result = signupSchema.safeParse({
      role: formData.get("role"),
      displayName: formData.get("displayName"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
      termsAccepted: formData.get("termsAccepted"),
      privacyAccepted: formData.get("privacyAccepted"),
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("borrower");
    }
  });

  it("rejects when role is missing from FormData", () => {
    const formData = new FormData();
    formData.set("displayName", "Juan dela Cruz");
    formData.set("email", "juan@example.com");
    formData.set("password", "securepass123");
    formData.set("confirmPassword", "securepass123");
    formData.set("termsAccepted", "on");
    formData.set("privacyAccepted", "on");

    const result = signupSchema.safeParse({
      role: formData.get("role"),
      displayName: formData.get("displayName"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
      termsAccepted: formData.get("termsAccepted"),
      privacyAccepted: formData.get("privacyAccepted"),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.role).toBeDefined();
    }
  });
});

describe("lender register schema validation", () => {
  const validInput = {
    displayName: "John Doe",
    email: "john@lending.com",
    organizationName: "Lending Corp",
    password: "securepassword123",
    confirmPassword: "securepassword123",
  };

  it("accepts valid lender register input", () => {
    const result = lenderRegisterSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects password mismatch with confirmPassword field error", () => {
    const result = lenderRegisterSchema.safeParse({
      ...validInput,
      confirmPassword: "differentpassword",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.confirmPassword).toBeDefined();
      expect(fieldErrors.confirmPassword).toContain("Passwords must match.");
    }
  });

  it("preserves other field data when password mismatch occurs", () => {
    const result = lenderRegisterSchema.safeParse({
      ...validInput,
      confirmPassword: "differentpassword",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.displayName).toBeUndefined();
      expect(fieldErrors.email).toBeUndefined();
      expect(fieldErrors.organizationName).toBeUndefined();
      expect(fieldErrors.password).toBeUndefined();
    }
  });

  it("rejects short organization name", () => {
    const result = lenderRegisterSchema.safeParse({
      ...validInput,
      organizationName: "A",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.organizationName).toBeDefined();
    }
  });
});

describe("lender onboarding schema validation", () => {
  const validInput = {
    organizationName: "Lending Corp",
    contactPerson: "Juan dela Cruz",
    phoneNumber: "+63 900 000 0000",
    businessAddress: "123 Main Street, Quezon City",
    operatingArea: "Metro Manila",
    businessRegistrationNumber: "SEC-12345",
    minLoanAmount: "5000",
    maxLoanAmount: "50000",
    typicalRepaymentTerms: "1 to 6 months",
    lenderDescription:
      "We provide micro-business lending solutions for Filipino entrepreneurs in Metro Manila.",
  };

  it("accepts valid lender onboarding input", () => {
    const result = lenderOnboardingSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.organizationName).toBe("Lending Corp");
      expect(result.data.minLoanAmount).toBe(5000);
      expect(result.data.maxLoanAmount).toBe(50000);
    }
  });

  it("accepts empty optional business registration number", () => {
    const result = lenderOnboardingSchema.safeParse({
      ...validInput,
      businessRegistrationNumber: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing organization name", () => {
    const result = lenderOnboardingSchema.safeParse({
      ...validInput,
      organizationName: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.organizationName).toBeDefined();
    }
  });

  it("rejects short lender description", () => {
    const result = lenderOnboardingSchema.safeParse({
      ...validInput,
      lenderDescription: "Too short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.lenderDescription).toBeDefined();
    }
  });

  it("rejects max loan below min loan", () => {
    const result = lenderOnboardingSchema.safeParse({
      ...validInput,
      minLoanAmount: "50000",
      maxLoanAmount: "5000",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.maxLoanAmount).toBeDefined();
    }
  });

  it("transforms string loan amounts to numbers", () => {
    const result = lenderOnboardingSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data.minLoanAmount).toBe("number");
      expect(typeof result.data.maxLoanAmount).toBe("number");
    }
  });

  it("rejects negative loan amounts", () => {
    const result = lenderOnboardingSchema.safeParse({
      ...validInput,
      minLoanAmount: "-100",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing phone number", () => {
    const result = lenderOnboardingSchema.safeParse({
      ...validInput,
      phoneNumber: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.phoneNumber).toBeDefined();
    }
  });

  it("rejects short business address", () => {
    const result = lenderOnboardingSchema.safeParse({
      ...validInput,
      businessAddress: "123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.businessAddress).toBeDefined();
    }
  });
});
