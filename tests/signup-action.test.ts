import { beforeEach, describe, expect, it, vi } from "vitest";
import { signupAction } from "../app/signup/actions";

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

  it("keeps unconfirmed email signups on the check-email state", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = mockSupabase("borrower", { id: "user-1" });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const result = await signupAction(previousState, createSignupFormData("borrower"));

    expect(result.status).toBe("success");
    expect(result.message).toContain("Check your email");
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

    const result = await signupAction(previousState, createSignupFormData("borrower"));

    expect(result.status).toBe("success");
    expect(result.message).toContain("Check your email");
    expect(result.confirmationEmail).toBe("juan@example.com");
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

    const result = await signupAction(previousState, createSignupFormData("lender"));

    expect(result.status).toBe("success");
    expect(result.message).toContain("Check your email");
    expect(result.confirmationEmail).toBe("juan@example.com");
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
      expect(result.message).toContain("production database migrations");
      expect(result.values?.role).toBe("lender");
      expect(consoleError).toHaveBeenCalledWith(
        "Signup failed",
        expect.objectContaining({
          message: "Database error saving new user",
          code: "SIGNUP_DATABASE_TRIGGER",
          sourceCode: "unexpected_failure",
          status: 500,
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

  it("treats repeat signup for an unconfirmed account as confirmation pending", async () => {
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

    const result = await signupAction(previousState, createSignupFormData("borrower"));

    expect(result.status).toBe("success");
    expect(result.message).toContain("Account already created");
    expect(supabase.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "juan@example.com",
      options: {
        emailRedirectTo: "http://localhost:3000/login?message=email-confirmed",
      },
    });
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
    expect(result.message).toContain("database migrations");
    expect(result.values).toEqual({
      displayName: "Juan dela Cruz",
      email: "juan@example.com",
      role: "borrower",
      termsAccepted: true,
      privacyAccepted: true,
    });
    expect(JSON.stringify(result)).not.toContain("securepass123");
    expect(console.error).toHaveBeenCalledWith(
      "Signup failed",
      expect.objectContaining({
        message: "database trigger failed for user provisioning",
        code: "SIGNUP_DATABASE_TRIGGER",
        sourceCode: "unexpected_failure",
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
    expect(result.message).toContain("database migrations");
    expect(JSON.stringify(result)).not.toContain("securepass123");
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
});
