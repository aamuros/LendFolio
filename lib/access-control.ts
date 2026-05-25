import { createSupabaseServerClient } from "./supabase/server";
import type { AppRole, Database } from "./supabase/types";
import { canAccessRole, isApprovedLender } from "./role-rules";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type LenderProfileRow =
  Database["public"]["Tables"]["lender_profiles"]["Row"];

export type CurrentUserProfile = ProfileRow & {
  lenderProfile: LenderProfileRow | null;
};

export type AccessResult =
  | {
      ok: true;
      supabase: SupabaseServerClient;
      profile: CurrentUserProfile;
    }
  | {
      ok: false;
      supabase: SupabaseServerClient | null;
      message: string;
      reason: "unauthenticated" | "forbidden" | "unavailable";
    };

export async function getCurrentUserProfile(
  supabase?: SupabaseServerClient,
): Promise<AccessResult> {
  const client = supabase ?? (await createSupabaseServerClient());

  try {
    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError || !user) {
      return {
        ok: false,
        supabase: client,
        reason: "unauthenticated",
        message: "Sign in to continue.",
      };
    }

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("id, role, display_name, status, created_at, updated_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return {
        ok: false,
        supabase: client,
        reason: "forbidden",
        message: "Your account does not have access to this workspace.",
      };
    }

    const { data: lenderProfile, error: lenderProfileError } =
      profile.role === "lender"
        ? await client
            .from("lender_profiles")
            .select(
              "id, user_id, organization_name, verification_status, approved_at, approved_by, created_at, updated_at",
            )
            .eq("user_id", profile.id)
            .maybeSingle()
        : { data: null, error: null };

    if (lenderProfileError) {
      return {
        ok: false,
        supabase: client,
        reason: "unavailable",
        message: "Could not confirm account access.",
      };
    }

    return {
      ok: true,
      supabase: client,
      profile: {
        ...profile,
        lenderProfile,
      },
    };
  } catch {
    return {
      ok: false,
      supabase: client,
      reason: "unavailable",
      message: "Sign in to continue.",
    };
  }
}

export async function requireRole(role: AppRole, supabase?: SupabaseServerClient) {
  const result = await getCurrentUserProfile(supabase);

  if (!result.ok) {
    return result;
  }

  if (!canAccessRole(result.profile, role)) {
    return {
      ok: false as const,
      supabase: result.supabase,
      reason: "forbidden" as const,
      message: "Your account does not have access to this workspace.",
    };
  }

  return result;
}

export function requireBorrower(supabase?: SupabaseServerClient) {
  return requireRole("borrower", supabase);
}

export async function requireApprovedLender(
  supabase?: SupabaseServerClient,
): Promise<AccessResult> {
  const result = await getCurrentUserProfile(supabase);

  if (!result.ok) {
    return result;
  }

  if (!isApprovedLender(result.profile)) {
    const verificationStatus = result.profile.lenderProfile?.verification_status;
    const message =
      result.profile.role === "lender" && verificationStatus === "pending"
        ? "Your lender access is pending review. You will be able to continue when your account is approved."
        : result.profile.role === "lender" && verificationStatus === "rejected"
          ? "Your lender access was not approved."
          : "Your account does not have access to this workspace.";

    return {
      ok: false,
      supabase: result.supabase,
      reason: "forbidden",
      message,
    };
  }

  return result;
}

export function requireManager(supabase?: SupabaseServerClient) {
  return requireRole("manager", supabase);
}
