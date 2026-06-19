import { createSupabaseServerClient } from "./supabase/server";
import type { AppRole, Database } from "./supabase/types";
import { canAccessRole, hasPrimaryRole, hasRole, isApprovedLender } from "./role-rules";

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

export const LENDER_OFFER_VERIFICATION_REQUIRED_MESSAGE =
  "Your lender verification must be approved before you can make loan offers.";

export async function getCurrentUserProfile(
  supabase?: SupabaseServerClient,
): Promise<AccessResult> {
  const client = supabase ?? (await createSupabaseServerClient());

  try {
    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError || !user || user.email_confirmed_at === null) {
      return {
        ok: false,
        supabase: client,
        reason: "unauthenticated",
        message: "Sign in to continue.",
      };
    }

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("id, role, additional_roles, display_name, status, created_at, updated_at")
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

    const isLender = hasRole(profile as CurrentUserProfile, "lender");

    const { data: lenderProfile, error: lenderProfileError } =
      isLender
        ? await client
            .from("lender_profiles")
            .select(
              "id, user_id, organization_name, contact_person, phone_number, business_address, operating_area, business_registration_number, address_region, address_city_or_municipality, address_barangay, address_zip_code, min_loan_amount, max_loan_amount, typical_repayment_terms, lender_description, verification_status, approved_at, approved_by, manager_review_notes, rejection_reason, rejected_at, rejected_by, created_at, updated_at",
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
      } as CurrentUserProfile,
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
  return requirePrimaryRole("borrower", supabase);
}

export async function requireApprovedLender(
  supabase?: SupabaseServerClient,
): Promise<AccessResult> {
  const result = await getCurrentUserProfile(supabase);

  if (!result.ok) {
    return result;
  }

  if (!isApprovedLender(result.profile)) {
    const userIsLender = hasPrimaryRole(result.profile, "lender");
    const message =
      userIsLender
        ? LENDER_OFFER_VERIFICATION_REQUIRED_MESSAGE
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

export async function requirePrimaryRole(
  role: AppRole,
  supabase?: SupabaseServerClient,
) {
  const result = await getCurrentUserProfile(supabase);

  if (!result.ok) {
    return result;
  }

  if (!hasPrimaryRole(result.profile, role)) {
    return {
      ok: false as const,
      supabase: result.supabase,
      reason: "forbidden" as const,
      message: "Your account does not have access to this workspace.",
    };
  }

  return result;
}
