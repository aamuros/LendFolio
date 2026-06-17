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

function mockSupabase(profileRole: "borrower" | "lender") {
  const signOut = vi.fn().mockResolvedValue({ error: null });
  const signUp = vi.fn().mockResolvedValue({
    data: {
      user: { id: "user-1" },
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
    auth: { signUp, signOut },
    from,
    signOut,
  };
}

describe("signup action role enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
