import { beforeEach, describe, expect, it, vi } from "vitest";
import { loginAction } from "../app/login/actions";

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

function createLoginFormData(email = "user@example.com", password = "password123") {
  const formData = new FormData();
  formData.set("email", email);
  formData.set("password", password);
  return formData;
}

const previousState = { message: "" };

function mockSupabase(overrides: {
  authUser?: { id: string } | null;
  profile?: { role: string; status: string } | null;
  lenderProfile?: { verification_status: string } | null;
} = {}) {
  const {
    authUser = { id: "user-1" },
    profile = { role: "lender", status: "active" },
    lenderProfile = { verification_status: "pending" },
  } = overrides;

  const mockMaybeSingle = vi.fn().mockResolvedValue({
    data: lenderProfile,
    error: null,
  });

  const mockLenderSelect = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      maybeSingle: mockMaybeSingle,
    }),
  });

  const mockProfileMaybeSingle = vi.fn().mockResolvedValue({
    data: profile,
    error: null,
  });

  const mockProfileSelect = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      maybeSingle: mockProfileMaybeSingle,
    }),
  });

  const from = vi.fn((table: string) => {
    if (table === "profiles") return { select: mockProfileSelect };
    if (table === "lender_profiles") return { select: mockLenderSelect };
    return { select: vi.fn() };
  });

  const signInWithPassword = vi.fn().mockResolvedValue({
    data: { user: authUser },
    error: null,
  });

  const supabase = {
    auth: { signInWithPassword },
    from,
  };

  return supabase;
}

describe("login routing for lenders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends pending lenders to /lender", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase({
        lenderProfile: { verification_status: "pending" },
      }) as never,
    );

    try {
      await loginAction(previousState, createLoginFormData());
      expect.fail("Expected redirect");
    } catch (error) {
      expect((error as Error).message).toBe("REDIRECT:/lender");
    }
  });

  it("sends approved lenders to /lender via getRouteForRole", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase({
        lenderProfile: { verification_status: "approved" },
      }) as never,
    );

    try {
      await loginAction(previousState, createLoginFormData());
      expect.fail("Expected redirect");
    } catch (error) {
      expect((error as Error).message).toBe("REDIRECT:/lender");
    }
  });

  it("sends incomplete lenders to /lender/onboarding", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase({
        lenderProfile: { verification_status: "incomplete" },
      }) as never,
    );

    try {
      await loginAction(previousState, createLoginFormData());
      expect.fail("Expected redirect");
    } catch (error) {
      expect((error as Error).message).toBe("REDIRECT:/lender/onboarding");
    }
  });

  it("sends rejected lenders to /lender/onboarding", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase({
        lenderProfile: { verification_status: "rejected" },
      }) as never,
    );

    try {
      await loginAction(previousState, createLoginFormData());
      expect.fail("Expected redirect");
    } catch (error) {
      expect((error as Error).message).toBe("REDIRECT:/lender/onboarding");
    }
  });

  it("sends lenders with no lender profile to /lender/onboarding", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase({
        lenderProfile: null,
      }) as never,
    );

    try {
      await loginAction(previousState, createLoginFormData());
      expect.fail("Expected redirect");
    } catch (error) {
      expect((error as Error).message).toBe("REDIRECT:/lender/onboarding");
    }
  });
});
