import { describe, expect, it } from "vitest";
import {
  classifySignupError,
  getSafeSignupErrorMessage,
  getSignupRetryDelayMs,
  isSignupDuplicateEmailError,
  isSignupValidationError,
} from "@/lib/auth-signup-errors";

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

    expect(
      classifySignupError({
        code: "email_exists",
        message: "User already registered",
      }),
    ).toBe("SIGNUP_EMAIL_REGISTERED");
  });

  it("provides sign-in and reset-password guidance for duplicate email", () => {
    const message = getSafeSignupErrorMessage("SIGNUP_EMAIL_REGISTERED");
    expect(message).toBe(
      "An account already exists with this email. Sign in instead or reset your password.",
    );
  });

  it("classifies invalid email from Supabase", () => {
    expect(
      classifySignupError({
        message: "Unable to validate email address: invalid format",
        status: 400,
      }),
    ).toBe("SIGNUP_INVALID_EMAIL");

    expect(
      classifySignupError({
        message: "invalid email",
        status: 400,
      }),
    ).toBe("SIGNUP_INVALID_EMAIL");

    expect(getSafeSignupErrorMessage("SIGNUP_INVALID_EMAIL")).toBe(
      "Enter a valid email address.",
    );
  });

  it("classifies password too short from Supabase", () => {
    expect(
      classifySignupError({
        message: "Password should be at least 6 characters",
        status: 400,
      }),
    ).toBe("SIGNUP_PASSWORD_TOO_SHORT");

    expect(
      classifySignupError({
        message: "password length must be at least 8",
        status: 422,
      }),
    ).toBe("SIGNUP_PASSWORD_TOO_SHORT");

    expect(getSafeSignupErrorMessage("SIGNUP_PASSWORD_TOO_SHORT")).toBe(
      "Password must be at least 8 characters.",
    );
  });

  it("classifies weak password from Supabase", () => {
    expect(
      classifySignupError({
        message: "Password is too weak",
        status: 400,
      }),
    ).toBe("SIGNUP_WEAK_PASSWORD");

    expect(
      classifySignupError({
        message: "password should be strong",
        status: 422,
      }),
    ).toBe("SIGNUP_WEAK_PASSWORD");

    expect(getSafeSignupErrorMessage("SIGNUP_WEAK_PASSWORD")).toContain(
      "stronger password",
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

  it("classifies Supabase rate-limit responses before other signup states", () => {
    expect(
      classifySignupError({
        code: "over_email_send_rate_limit",
        message: "For security purposes, you can only request this after 60 seconds",
        status: 429,
      }),
    ).toBe("SIGNUP_RATE_LIMITED");

    expect(
      classifySignupError({
        message: "Too many requests",
        status: 400,
      }),
    ).toBe("SIGNUP_RATE_LIMITED");

    expect(
      classifySignupError({
        code: "user_already_exists",
        message: "Too many requests for user already registered",
        status: 429,
      }),
    ).toBe("SIGNUP_RATE_LIMITED");

    expect(getSafeSignupErrorMessage("SIGNUP_RATE_LIMITED")).toContain(
      "This does not mean the email was sent",
    );
  });

  it("caps Supabase retry delays for the signup UI cooldown", () => {
    expect(
      getSignupRetryDelayMs({
        message: "For security purposes, you can only request this after 58 seconds",
      }),
    ).toBe(10_000);
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

  it("classifies signup disabled errors", () => {
    expect(
      classifySignupError({
        message: "signup is disabled",
        status: 403,
      }),
    ).toBe("SIGNUP_AUTH_PROVIDER");

    expect(
      classifySignupError({
        code: "signup_disabled",
        message: "Signups not allowed",
      }),
    ).toBe("SIGNUP_AUTH_PROVIDER");
  });

  it("classifies email provider disabled errors", () => {
    expect(
      classifySignupError({
        code: "email_provider_disabled",
        message: "Error sending confirmation email",
      }),
    ).toBe("SIGNUP_CONFIRMATION_SEND_FAILED");
  });

  it("isSignupDuplicateEmailError returns true for duplicate email codes", () => {
    expect(isSignupDuplicateEmailError("SIGNUP_EMAIL_REGISTERED")).toBe(true);
    expect(isSignupDuplicateEmailError("SIGNUP_RATE_LIMITED")).toBe(false);
    expect(isSignupDuplicateEmailError(undefined)).toBe(false);
  });

  it("isSignupValidationError returns true for validation error codes", () => {
    expect(isSignupValidationError("SIGNUP_INVALID_EMAIL")).toBe(true);
    expect(isSignupValidationError("SIGNUP_WEAK_PASSWORD")).toBe(true);
    expect(isSignupValidationError("SIGNUP_PASSWORD_TOO_SHORT")).toBe(true);
    expect(isSignupValidationError("SIGNUP_INVALID_REQUEST")).toBe(true);
    expect(isSignupValidationError("SIGNUP_EMAIL_REGISTERED")).toBe(false);
    expect(isSignupValidationError("SIGNUP_RATE_LIMITED")).toBe(false);
    expect(isSignupValidationError(undefined)).toBe(false);
  });
});
