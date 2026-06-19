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
  return formData;
}

describe("lender register action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("treats repeat signup for an unconfirmed lender account as confirmation pending", async () => {
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
    expect(result.message).toContain("Account already created");
    expect(resend).toHaveBeenCalledWith({
      type: "signup",
      email: "lender@example.com",
      options: {
        emailRedirectTo: "http://localhost:3000/login?message=email-confirmed",
      },
    });
  });
});
