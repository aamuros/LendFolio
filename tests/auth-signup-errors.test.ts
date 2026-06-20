import { describe, expect, it } from "vitest";
import { classifySignupError, getSafeSignupErrorMessage } from "@/lib/auth-signup-errors";

describe("signup auth error classification", () => {
  it("classifies duplicate email states", () => {
    expect(
      classifySignupError({
        message: "User already registered",
        name: "AuthApiError",
        status: 400,
      }),
    ).toBe("SIGNUP_EMAIL_REGISTERED");

    expect(
      classifySignupError({
        message: "email already exists",
      }),
    ).toBe("SIGNUP_EMAIL_REGISTERED");

    expect(getSafeSignupErrorMessage("SIGNUP_EMAIL_REGISTERED")).toBe(
      "This email already has an account or pending confirmation. Please sign in or check your email.",
    );
  });

  it("classifies database trigger failures", () => {
    expect(
      classifySignupError({
        code: "unexpected_failure",
        message: "Database error saving new user",
        status: 500,
      }),
    ).toBe("SIGNUP_DATABASE_TRIGGER");

    expect(
      classifySignupError({
        message: "duplicate key value violates unique constraint",
      }),
    ).toBe("SIGNUP_EMAIL_REGISTERED");
  });

  it("classifies RLS and permission failures as provisioning failures", () => {
    expect(
      classifySignupError({
        message: "new row violates row-level security policy for table profiles",
      }),
    ).toBe("SIGNUP_DATABASE_TRIGGER");

    expect(
      classifySignupError({
        message: "permission denied for schema app_private",
      }),
    ).toBe("SIGNUP_DATABASE_TRIGGER");

    expect(
      classifySignupError({
        message: "permission denied for table lender_profiles",
      }),
    ).toBe("SIGNUP_DATABASE_TRIGGER");
  });
});
