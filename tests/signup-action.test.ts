import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  resendSignupConfirmationAction,
  signupAction,
} from "../app/signup/actions";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  RedirectType: {
    push: "push",
    replace: "replace",
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/lib/consent-recording", () => ({
  acceptBaselineUserConsents: vi.fn().mockResolvedValue(true),
  getSignupConsentMetadata: vi.fn(() => ({
    signup_terms_accepted: true,
    signup_privacy_accepted: true,
    signup_terms_version: "2026-05-terms-v1",
    signup_privacy_version: "2026-05-privacy-v1",
    signup_consent_ip_address: null,
    signup_consent_user_agent: null,
  })),
}));

const previousState = {
  message: "",
  status: "idle" as const,
};

function createSignupFormData(role: "borrower" | "lender") {
  const formData = new FormData();
  formData.set("role", role);
  formData.set("displayName", "Juan dela Cruz");
  formData.set("email", "juan@example.com");
  formData.set("password", "securepass123");
  formData.set("confirmPassword", "securepass123");
  formData.set("termsAccepted", "on");
  formData.set("privacyAccepted", "on");
  return formData;
}

function mockSupabase(
  profileRole: "borrower" | "lender",
  user: { id: string; email_confirmed_at?: string; confirmed_at?: string } = {
    id: "user-1",
    email_confirmed_at: "2026-01-01T00:00:00.000Z",
  },
) {
  const signOut = vi.fn().mockResolvedValue({ error: null });
  const resend = vi.fn().mockResolvedValue({ data: {}, error: null });
  const signUp = vi.fn().mockResolvedValue({
    data: {
      user,
      session: { access_token: "token" },
    },
    error: null,
  });
  const maybeSingle = vi.fn().mockResolvedValue({
    data: { role: profileRole },
    error: null,
  });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });

  return {
    auth: { signUp, signOut, resend },
    from,
    signOut,
    resend,
    signUp,
  };
}

describe("signup action role enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("does not redirect to lender when borrower signup resolves to a lender profile", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = mockSupabase("lender");
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const result = await signupAction(previousState, createSignupFormData("borrower"));

    expect(result.status).toBe("error");
    expect(result.message).toBe(
      "This account is registered as a lender. Sign out and use another email to create a borrower account.",
    );
    expect(result.values?.role).toBe("borrower");
    expect(supabase.signOut).toHaveBeenCalled();
  });

  it("redirects unconfirmed email signups to the check-email page", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = mockSupabase("borrower", { id: "user-1" });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    await expect(
      signupAction(previousState, createSignupFormData("borrower")),
    ).rejects.toThrow("REDIRECT:/signup/check-email?email=juan%40example.com");

    expect(supabase.signOut).toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("treats no-session signup responses as confirmation pending", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = mockSupabase("borrower");
    supabase.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: null,
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    await expect(
      signupAction(previousState, createSignupFormData("borrower")),
    ).rejects.toThrow("REDIRECT:/signup/check-email?email=juan%40example.com");

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("shows the confirmation email state after lender signup without an immediate session", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = mockSupabase("lender");
    supabase.signUp.mockResolvedValueOnce({
      data: { user: { id: "lender-user-1" }, session: null },
      error: null,
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    await expect(
      signupAction(previousState, createSignupFormData("lender")),
    ).rejects.toThrow("REDIRECT:/signup/check-email?email=juan%40example.com");

    expect(supabase.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "juan@example.com",
        password: "securepass123",
        options: expect.objectContaining({
          emailRedirectTo: "http://localhost:3000/login?message=email-confirmed",
          data: expect.objectContaining({
            lendfolio_role: "lender",
            display_name: "Juan dela Cruz",
            signup_terms_accepted: true,
            signup_privacy_accepted: true,
            signup_terms_version: "2026-05-terms-v1",
            signup_privacy_version: "2026-05-privacy-v1",
          }),
        }),
      }),
    );
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("reports Supabase database signup failures as account setup unavailable", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const supabase = mockSupabase("lender");
    supabase.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: {
        code: "unexpected_failure",
        message: "Database error saving new user",
        name: "AuthApiError",
        status: 500,
      },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    try {
      const result = await signupAction(
        previousState,
        createSignupFormData("lender"),
      );

      expect(result.status).toBe("error");
      expect(result.message).toContain("Account setup could not finish");
      expect(result.values?.role).toBe("lender");
      expect(consoleError).toHaveBeenCalledWith(
        "[auth-signup-diagnostic]",
        expect.objectContaining({
          flow: "signup",
          role: "lender",
          source: "signUp",
          message: "Database error saving new user",
          classifiedErrorCode: "SIGNUP_DATABASE_TRIGGER",
          supabaseErrorCode: "unexpected_failure",
          httpStatus: 500,
        }),
      );
      expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
        "juan@example.com",
      );
      expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
        "securepass123",
      );
      expect(consoleError).not.toHaveBeenCalledWith(
        "[auth-signup]",
        expect.objectContaining({
          code: "unexpected_failure",
        }),
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it("blocks an already registered email instead of sending another confirmation", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = mockSupabase("borrower");
    supabase.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: {
        code: "user_already_exists",
        message: "User already registered",
      },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const result = await signupAction(
      previousState,
      createSignupFormData("borrower"),
    );

    expect(result.errorCode).toBe("SIGNUP_EMAIL_REGISTERED");
    expect(result.canResendConfirmation).toBeUndefined();
    expect(supabase.resend).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("sends normalized lowercase email to Supabase", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = mockSupabase("borrower");
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const formData = createSignupFormData("borrower");
    formData.set("email", "  Juan@Example.COM  ");

    try {
      await signupAction(previousState, formData);
    } catch {
      // redirect throws
    }

    expect(supabase.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "juan@example.com",
      }),
    );
  });

  it("resend confirmation returns safe success copy without revealing account existence", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = mockSupabase("borrower");
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);
    const formData = new FormData();
    formData.set("email", "juan@example.com");

    const result = await resendSignupConfirmationAction(previousState, formData);

    expect(result.status).toBe("success");
    expect(result.message).toBe(
      "If this email has a pending account, we sent a new confirmation link.",
    );
    expect(supabase.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "juan@example.com",
      options: {
        emailRedirectTo: "http://localhost:3000/login?message=email-confirmed",
      },
    });
    expect(JSON.stringify(result)).not.toContain("securepass123");
  });

  it("resend confirmation handles Supabase rate limits separately", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = mockSupabase("borrower");
    supabase.resend.mockResolvedValueOnce({
      data: {},
      error: {
        code: "over_email_send_rate_limit",
        message: "For security purposes, you can only request this after 58 seconds",
        status: 429,
      },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);
    const formData = new FormData();
    formData.set("email", "juan@example.com");
    const before = Date.now();

    const result = await resendSignupConfirmationAction(previousState, formData);

    expect(result.status).toBe("error");
    expect(result.errorCode).toBe("SIGNUP_RATE_LIMITED");
    expect(result.message).toContain("This does not mean the email was sent");
    expect(result.rateLimitCooldownEndsAt).toBeGreaterThanOrEqual(before + 10_000);
    expect(result.rateLimitCooldownEndsAt).toBeLessThan(before + 11_000);
    expect(supabase.signUp).not.toHaveBeenCalled();
  });

  it("resend confirmation returns an error for SMTP delivery failures", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const supabase = mockSupabase("borrower");
    supabase.resend.mockResolvedValueOnce({
      data: {},
      error: {
        code: "email_provider_disabled",
        message:
          "Error sending confirmation email to juan@example.com through SMTP",
        status: 500,
      },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);
    const formData = new FormData();
    formData.set("email", "juan@example.com");

    try {
      const result = await resendSignupConfirmationAction(previousState, formData);

      expect(result.status).toBe("error");
      expect(result.errorCode).toBe("SIGNUP_CONFIRMATION_SEND_FAILED");
      expect(result.message).not.toContain("sent a new confirmation link");
      expect(result.message).not.toContain("We sent");
      expect(consoleError).toHaveBeenCalledWith(
        "[auth-signup-diagnostic]",
        expect.objectContaining({
          flow: "signup",
          role: "borrower",
          source: "resend",
          classifiedErrorCode: "SIGNUP_CONFIRMATION_SEND_FAILED",
          message:
            "Error sending confirmation email to [redacted-email] through SMTP",
        }),
      );
      expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
        "juan@example.com",
      );
      expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
        "securepass123",
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it("resend confirmation returns an error when Supabase resend throws", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const supabase = mockSupabase("borrower");
    supabase.resend.mockRejectedValueOnce(
      new Error("fetch failed for juan@example.com"),
    );
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);
    const formData = new FormData();
    formData.set("email", "juan@example.com");

    try {
      const result = await resendSignupConfirmationAction(previousState, formData);

      expect(result.status).toBe("error");
      expect(result.message).not.toContain("sent a new confirmation link");
      expect(result.message).not.toContain("We sent");
      expect(consoleError).toHaveBeenCalledWith(
        "[auth-signup-diagnostic]",
        expect.objectContaining({
          flow: "signup",
          role: "borrower",
          source: "resend",
          message: "fetch failed for [redacted-email]",
        }),
      );
      expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
        "juan@example.com",
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it("shows resend confirmation when signup account creation hits an email delivery error", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = mockSupabase("borrower");
    supabase.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: {
        code: "email_provider_disabled",
        message: "Error sending confirmation email",
      },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    await expect(
      signupAction(previousState, createSignupFormData("borrower")),
    ).rejects.toThrow(
      "REDIRECT:/signup/check-email?email=juan%40example.com&status=delivery_failed",
    );

    expect(supabase.resend).not.toHaveBeenCalled();
  });

  it("keeps signup delivery errors as errors even when Supabase returns an unconfirmed user and session", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = mockSupabase("borrower");
    supabase.signUp.mockResolvedValueOnce({
      data: {
        user: { id: "user-1", email_confirmed_at: null },
        session: { access_token: "unexpected-token" },
      },
      error: {
        code: "email_provider_disabled",
        message: "Error sending confirmation email",
      },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    await expect(
      signupAction(previousState, createSignupFormData("borrower")),
    ).rejects.toThrow(
      "REDIRECT:/signup/check-email?email=juan%40example.com&status=delivery_failed",
    );

    expect(supabase.signOut).toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("keeps safe field values after a failed signup without returning passwords", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = mockSupabase("borrower");
    supabase.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: {
        code: "unexpected_failure",
        message: "database trigger failed for user provisioning",
      },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const result = await signupAction(previousState, createSignupFormData("borrower"));

    expect(result.status).toBe("error");
    expect(result.errorCode).toBe("SIGNUP_DATABASE_TRIGGER");
    expect(result.message).toContain("Account setup could not finish");
    expect(result.values).toEqual({
      displayName: "Juan dela Cruz",
      email: "juan@example.com",
      role: "borrower",
      termsAccepted: true,
      privacyAccepted: true,
    });
    expect(JSON.stringify(result)).not.toContain("securepass123");
    expect(console.error).toHaveBeenCalledWith(
      "[auth-signup-diagnostic]",
      expect.objectContaining({
        message: "database trigger failed for user provisioning",
        classifiedErrorCode: "SIGNUP_DATABASE_TRIGGER",
        supabaseErrorCode: "unexpected_failure",
        source: "signUp",
      }),
    );
  });

  it("returns an actionable safe message for missing Supabase configuration", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    vi.mocked(createSupabaseServerClient).mockRejectedValueOnce(
      new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY."),
    );

    const result = await signupAction(previousState, createSignupFormData("borrower"));

    expect(result.status).toBe("error");
    expect(result.errorCode).toBe("SIGNUP_ENV_MISSING");
    expect(result.message).toContain("Supabase URL and anon key");
    expect(JSON.stringify(result)).not.toContain("securepass123");
  });

  it("classifies Supabase fetch failures as configuration problems", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = mockSupabase("borrower");
    supabase.signUp.mockRejectedValueOnce(new TypeError("fetch failed"));
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const result = await signupAction(previousState, createSignupFormData("borrower"));

    expect(result.status).toBe("error");
    expect(result.errorCode).toBe("SIGNUP_SUPABASE_CONFIG");
    expect(result.message).toContain("Supabase project settings");
    expect(JSON.stringify(result)).not.toContain("securepass123");
  });

  it("classifies nested Supabase connection failures from error causes", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = mockSupabase("borrower");
    supabase.signUp.mockRejectedValueOnce(
      new Error("Request failed", {
        cause: Object.assign(new Error("connect ENOTFOUND old-project.supabase.co"), {
          code: "ENOTFOUND",
        }),
      }),
    );
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const result = await signupAction(previousState, createSignupFormData("borrower"));

    expect(result.status).toBe("error");
    expect(result.errorCode).toBe("SIGNUP_SUPABASE_CONFIG");
    expect(result.message).toContain("Supabase project settings");
    expect(JSON.stringify(result)).not.toContain("securepass123");
  });

  it("classifies unlabelled Supabase server failures as account setup failures", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = mockSupabase("borrower");
    supabase.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: {
        message: "Internal server error",
        name: "AuthApiError",
        status: 500,
      },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const result = await signupAction(previousState, createSignupFormData("borrower"));

    expect(result.status).toBe("error");
    expect(result.errorCode).toBe("SIGNUP_DATABASE_TRIGGER");
    expect(result.message).toContain("Account setup could not finish");
    expect(JSON.stringify(result)).not.toContain("securepass123");
  });

  it("does not report email-specific Supabase Auth validation as project config", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = mockSupabase("borrower");
    supabase.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: {
        message: "Unable to validate email address: invalid format",
        name: "AuthApiError",
        status: 400,
      },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const result = await signupAction(previousState, createSignupFormData("borrower"));

    expect(result.status).toBe("error");
    expect(result.errorCode).toBe("SIGNUP_INVALID_EMAIL");
    expect(result.message).toContain("valid email address");
    expect(result.message).not.toContain("Supabase project settings");
    expect(JSON.stringify(result)).not.toContain("securepass123");
  });

  it("reports Supabase Auth rate limits without blaming project config", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const supabase = mockSupabase("borrower");
    supabase.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: {
        code: "over_email_send_rate_limit",
        message: "For security purposes, you can only request this after 60 seconds",
        name: "AuthApiError",
        status: 429,
      },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const result = await signupAction(previousState, createSignupFormData("borrower"));

    expect(result.status).toBe("error");
    expect(result.errorCode).toBe("SIGNUP_RATE_LIMITED");
    expect(result.rateLimitCooldownEndsAt).toEqual(expect.any(Number));
    expect(result.message).toContain("This does not mean the email was sent");
    expect(result.message).not.toContain("Supabase project settings");
    expect(result.values).toEqual({
      displayName: "Juan dela Cruz",
      email: "juan@example.com",
      role: "borrower",
      termsAccepted: true,
      privacyAccepted: true,
    });
    expect(result.canResendConfirmation).toBe(true);
    expect(result.confirmationEmail).toBe("juan@example.com");
    expect(supabase.resend).not.toHaveBeenCalled();
    expect(supabase.signUp).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      "[auth-signup-diagnostic]",
      expect.objectContaining({
        flow: "signup",
        role: "borrower",
        source: "signUp",
        supabaseErrorCode: "over_email_send_rate_limit",
        httpStatus: 429,
        message: "For security purposes, you can only request this after 60 seconds",
        classifiedErrorCode: "SIGNUP_RATE_LIMITED",
      }),
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "juan@example.com",
    );
    expect(JSON.stringify(result)).not.toContain("securepass123");
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "securepass123",
    );
  });

  it("does not treat a rate-limited signup as confirmation send failure or pending confirmation", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = mockSupabase("borrower");
    supabase.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: {
        code: "over_email_send_rate_limit",
        message: "Too many requests for confirmation email",
        name: "AuthApiError",
        status: 429,
      },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const result = await signupAction(previousState, createSignupFormData("borrower"));

    expect(result.status).toBe("error");
    expect(result.errorCode).toBe("SIGNUP_RATE_LIMITED");
    expect(result.message).not.toContain("confirmation email could not be sent");
    expect(result.message).not.toContain("An account may already exist");
    expect(result.confirmationEmail).toBe("juan@example.com");
    expect(result.canResendConfirmation).toBe(true);
    expect(supabase.resend).not.toHaveBeenCalled();
  });

  it("does not expose passwords in signup state, logs, or browser storage fields", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const supabase = mockSupabase("borrower");
    supabase.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: {
        code: "over_email_send_rate_limit",
        message: "Too many requests",
        status: 429,
      },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const result = await signupAction(previousState, createSignupFormData("borrower"));
    const serializedState = JSON.stringify(result);
    const serializedLogs = JSON.stringify(consoleError.mock.calls);

    expect(serializedState).not.toContain("securepass123");
    expect(serializedLogs).not.toContain("securepass123");
    expect(result).not.toHaveProperty("password");
    expect(result).not.toHaveProperty("confirmPassword");
    expect(serializedState).not.toContain("localStorage");
    expect(serializedState).not.toContain("sessionStorage");
  });

  it("keeps consent values from invalid submissions in server state", async () => {
    const formData = createSignupFormData("lender");
    formData.set("email", "not-an-email");

    const result = await signupAction(previousState, formData);

    expect(result.status).toBe("error");
    expect(result.values).toMatchObject({
      displayName: "Juan dela Cruz",
      email: "not-an-email",
      role: "lender",
      termsAccepted: true,
      privacyAccepted: true,
    });
    expect(JSON.stringify(result)).not.toContain("securepass123");
  });

  it("shows sign-in-or-reset guidance for a duplicate confirmed email", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = mockSupabase("borrower");
    supabase.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: {
        code: "user_already_exists",
        message: "User already registered",
        status: 400,
      },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const result = await signupAction(previousState, createSignupFormData("borrower"));

    expect(result.status).toBe("error");
    expect(result.errorCode).toBe("SIGNUP_EMAIL_REGISTERED");
    expect(result.message).toContain("Sign in instead or reset your password");
    expect(result.message).not.toContain("Check your email");
    expect(result.message).not.toContain("pending account");
  });

  it("blocks a duplicate unconfirmed email without offering another confirmation", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = mockSupabase("borrower");
    supabase.signUp.mockResolvedValueOnce({
      data: {
        user: { id: "user-1", identities: [], email_confirmed_at: null },
        session: null,
      },
      error: null,
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const result = await signupAction(previousState, createSignupFormData("borrower"));

    expect(result.status).toBe("error");
    expect(result.errorCode).toBe("SIGNUP_EMAIL_REGISTERED");
    expect(result.message).toContain("did not create a new account");
    expect(result.confirmationEmail).toBeUndefined();
  });

  it("blocks Supabase's obfuscated duplicate user across signup roles", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = mockSupabase("borrower");
    supabase.signUp.mockResolvedValueOnce({
      data: {
        user: { id: "existing-user", identities: [], email_confirmed_at: null },
        session: null,
      },
      error: null,
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const result = await signupAction(previousState, createSignupFormData("lender"));

    expect(result.errorCode).toBe("SIGNUP_EMAIL_REGISTERED");
    expect(result.canResendConfirmation).toBeUndefined();
    expect(result.confirmationEmail).toBeUndefined();
  });

  it("includes confirmation email and resend option on successful signup requiring confirmation", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = mockSupabase("borrower", { id: "user-1" });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const result = await signupAction(previousState, createSignupFormData("borrower"));

    expect(result.status).toBe("success");
    expect(result.message).toContain("Check your email");
    expect(result.confirmationEmail).toBe("juan@example.com");
  });

  it("sets a cooldown timestamp when signup is rate-limited for resend countdown", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = mockSupabase("borrower");
    supabase.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: {
        code: "over_email_send_rate_limit",
        message: "For security purposes, you can only request this after 45 seconds",
        status: 429,
      },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);
    const before = Date.now();

    const result = await signupAction(previousState, createSignupFormData("borrower"));

    expect(result.status).toBe("error");
    expect(result.errorCode).toBe("SIGNUP_RATE_LIMITED");
    expect(result.rateLimitCooldownEndsAt).toBeGreaterThanOrEqual(before + 45_000);
    expect(result.rateLimitCooldownEndsAt).toBeLessThan(before + 46_000);
    expect(result.canResendConfirmation).toBe(true);
    expect(result.confirmationEmail).toBe("juan@example.com");
    expect(result.message).not.toContain("SIGNUP_RATE_LIMITED");
    expect(result.message).not.toContain("over_email_send_rate_limit");
  });

  it("never exposes Supabase error codes in user-facing signup messages", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = mockSupabase("borrower");
    supabase.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: {
        code: "over_email_send_rate_limit",
        message: "For security purposes, you can only request this after 60 seconds",
        status: 429,
      },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const result = await signupAction(previousState, createSignupFormData("borrower"));

    expect(result.message).not.toContain("SIGNUP_");
    expect(result.message).not.toContain("over_email_send_rate_limit");
    expect(result.message).not.toContain("user_already_exists");
    expect(result.message).not.toContain("email_provider_disabled");
    expect(result.message).not.toContain("AuthApiError");
    expect(result.message).not.toContain("unexpected_failure");
  });

  it("never exposes Supabase error codes in resend confirmation messages", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = mockSupabase("borrower");
    supabase.resend.mockResolvedValueOnce({
      data: {},
      error: {
        code: "over_email_send_rate_limit",
        message: "For security purposes, you can only request this after 30 seconds",
        status: 429,
      },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);
    const formData = new FormData();
    formData.set("email", "juan@example.com");

    const result = await resendSignupConfirmationAction(previousState, formData);

    expect(result.message).not.toContain("SIGNUP_");
    expect(result.message).not.toContain("over_email_send_rate_limit");
    expect(result.message).not.toContain("AuthApiError");
  });
});
