import { describe, expect, it, vi, beforeEach } from "vitest";
import { getCurrentUserProfile } from "../lib/access-control";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

function mockProfileQuery(profile: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: profile,
    error: null,
  });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  return { maybeSingle, eq, select };
}

describe("current user access control", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an email verification message before querying workspace access", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const from = vi.fn();
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from,
    } as never);

    const result = await getCurrentUserProfile();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("email_unverified");
      expect(result.message).toContain("Confirm your email");
    }
    expect(from).not.toHaveBeenCalled();
  });

  it("accepts Supabase confirmed_at as a confirmed email signal", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const profileQuery = mockProfileQuery({
      id: "user-1",
      role: "borrower",
      additional_roles: [],
      display_name: "Juan dela Cruz",
      status: "active",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-1",
              confirmed_at: "2026-01-01T00:00:00.000Z",
            },
          },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({ select: profileQuery.select }),
    } as never);

    const result = await getCurrentUserProfile();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profile.role).toBe("borrower");
    }
  });
});
