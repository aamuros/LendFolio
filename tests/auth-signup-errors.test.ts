import { describe, expect, it } from "vitest";
import {
  classifySignupError,
  getSafeSignupErrorMessage,
  getSignupRetryDelayMs,
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
});
