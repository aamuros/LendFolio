import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../app/auth/confirm/route";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

function createSupabaseMock() {
  return {
    auth: {
      verifyOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
      exchangeCodeForSession: vi.fn().mockResolvedValue({
        data: {},
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  };
}

describe("auth confirmation route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("verifies token hash confirmation links and redirects to login", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = createSupabaseMock();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const response = await GET(
      new Request(
        "https://lendfolio.test/auth/confirm?token_hash=token-1&type=email&next=/login?message=email-confirmed",
      ) as never,
    );

    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: "token-1",
      type: "email",
    });
    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://lendfolio.test/login?message=email-confirmed",
    );
  });

  it("exchanges PKCE code callbacks and allows same-origin next paths", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = createSupabaseMock();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const response = await GET(
      new Request(
        "https://lendfolio.test/auth/confirm?code=code-1&next=/borrower",
      ) as never,
    );

    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith("code-1");
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://lendfolio.test/borrower",
    );
  });

  it("falls back to the login notice for cross-origin next URLs", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = createSupabaseMock();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const response = await GET(
      new Request(
        "https://lendfolio.test/auth/confirm?code=code-1&next=https%3A%2F%2Fexample.com%2Fphish",
      ) as never,
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://lendfolio.test/login?message=email-confirmed",
    );
  });
});
