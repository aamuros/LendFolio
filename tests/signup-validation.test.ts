import { describe, expect, it } from "vitest";
import { signupSchema } from "../lib/signup";
import { lenderRegisterSchema } from "../lib/lender-register";

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
