import { beforeEach, describe, expect, it, vi } from "vitest";
import { lenderRegisterAction } from "../app/lender/register/actions";

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

function createLenderRegisterFormData() {
  const formData = new FormData();
  formData.set("displayName", "Juan dela Cruz");
  formData.set("email", "lender@example.com");
  formData.set("organizationName", "Lending Corp");
  formData.set("password", "securepass123");
  formData.set("confirmPassword", "securepass123");
  formData.set("termsAccepted", "on");
  formData.set("privacyAccepted", "on");
  return formData;
}

describe("lender register action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("treats no-session signup responses as confirmation pending", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const signUp = vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });
    const supabase = {
      auth: {
        signUp,
        resend: vi.fn(),
        signOut: vi.fn(),
      },
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const result = await lenderRegisterAction(
      previousState,
      createLenderRegisterFormData(),
    );

    expect(result.status).toBe("success");
    expect(result.message).toContain("Check your email");
    expect(result.confirmationEmail).toBe("lender@example.com");
    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          data: expect.objectContaining({
            lendfolio_role: "lender",
            organization_name: "Lending Corp",
            signup_terms_accepted: true,
            signup_privacy_accepted: true,
            signup_terms_version: "2026-05-terms-v1",
            signup_privacy_version: "2026-05-privacy-v1",
          }),
        }),
      }),
    );
  });

  it("treats repeat signup for an unconfirmed lender account as confirmation pending without resending email", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const signUp = vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: {
        code: "email_exists",
        message: "User already registered",
      },
    });
    const resend = vi.fn().mockResolvedValue({ data: {}, error: null });
    const supabase = {
      auth: {
        signUp,
        resend,
        signOut: vi.fn(),
      },
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const result = await lenderRegisterAction(
      previousState,
      createLenderRegisterFormData(),
    );

    expect(result.status).toBe("success");
    expect(result.message).toContain("pending account");
    expect(result.message).toContain("resend the confirmation link");
    expect(result.confirmationEmail).toBe("lender@example.com");
    expect(resend).not.toHaveBeenCalled();
  });

  it("keeps confirmation delivery failures as errors when Supabase returns no user", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const signUp = vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: {
        code: "email_provider_disabled",
        message: "Error sending confirmation email",
      },
    });
    const supabase = {
      auth: {
        signUp,
        resend: vi.fn(),
        signOut: vi.fn(),
      },
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const result = await lenderRegisterAction(
      previousState,
      createLenderRegisterFormData(),
    );

    expect(result.status).toBe("error");
    expect(result.errorCode).toBe("SIGNUP_CONFIRMATION_SEND_FAILED");
    expect(result.canResendConfirmation).toBe(true);
    expect(result.confirmationEmail).toBe("lender@example.com");
    expect(result.message).toContain("could not send a confirmation email");
    expect(result.message).not.toContain("Account created");
    expect(result.message).not.toContain("Check your email");
    expect(result.message).not.toContain("We sent");
  });

  it("keeps confirmation delivery failures as errors when Supabase returns an unconfirmed user and session", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const signUp = vi.fn().mockResolvedValue({
      data: {
        user: { id: "lender-user-1", email_confirmed_at: null },
        session: { access_token: "unexpected-token" },
      },
      error: {
        code: "email_provider_disabled",
        message: "Error sending confirmation email",
      },
    });
    const supabase = {
      auth: {
        signUp,
        resend: vi.fn(),
        signOut,
      },
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const result = await lenderRegisterAction(
      previousState,
      createLenderRegisterFormData(),
    );

    expect(result.status).toBe("error");
    expect(result.errorCode).toBe("SIGNUP_CONFIRMATION_SEND_FAILED");
    expect(result.canResendConfirmation).toBe(true);
    expect(result.confirmationEmail).toBe("lender@example.com");
    expect(result.message).not.toContain("Account created");
    expect(result.message).not.toContain("Check your email");
    expect(result.message).not.toContain("We sent");
    expect(signOut).toHaveBeenCalled();
  });

  it("reports Supabase database signup failures as account setup unavailable", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const signUp = vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: {
        code: "unexpected_failure",
        message: "Database error saving new user",
        name: "AuthApiError",
        status: 500,
      },
    });
    const supabase = {
      auth: {
        signUp,
        resend: vi.fn(),
        signOut: vi.fn(),
      },
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    try {
      const result = await lenderRegisterAction(
        previousState,
        createLenderRegisterFormData(),
      );

      expect(result.status).toBe("error");
      expect(result.message).toBe(
        "Account setup is temporarily unavailable. Try again later.",
      );
      expect(consoleError).toHaveBeenCalledWith(
        "[auth-signup]",
        expect.objectContaining({
          flow: "lender_register",
          role: "lender",
          code: "unexpected_failure",
          name: "AuthApiError",
          status: 500,
          message: "Database error saving new user",
        }),
      );
      expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
        "lender@example.com",
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it("requires explicit Terms and Privacy acceptance", async () => {
    const formData = createLenderRegisterFormData();
    formData.delete("termsAccepted");
    formData.delete("privacyAccepted");

    const result = await lenderRegisterAction(previousState, formData);

    expect(result.status).toBe("error");
    expect(result.fieldErrors?.termsAccepted).toBeDefined();
    expect(result.fieldErrors?.privacyAccepted).toBeDefined();
  });

  it("sends lender role and organization_name in signup metadata without onboarding fields", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const signUp = vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });
    const supabase = {
      auth: {
        signUp,
        resend: vi.fn(),
        signOut: vi.fn(),
      },
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    await lenderRegisterAction(previousState, createLenderRegisterFormData());

    const metadata = signUp.mock.calls[0][0].options.data;

    expect(metadata.lendfolio_role).toBe("lender");
    expect(metadata.display_name).toBe("Juan dela Cruz");
    expect(metadata.organization_name).toBe("Lending Corp");
    expect(metadata.phone_number).toBeUndefined();
    expect(metadata.business_address).toBeUndefined();
    expect(metadata.operating_area).toBeUndefined();
    expect(metadata.min_loan_amount).toBeUndefined();
    expect(metadata.max_loan_amount).toBeUndefined();
    expect(metadata.typical_repayment_terms).toBeUndefined();
    expect(metadata.lender_description).toBeUndefined();
  });
});
