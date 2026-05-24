import type { AppRole, LenderVerificationStatus, ProfileStatus } from "./supabase/types";

export function canAccessRole(
  profile: { role: AppRole; status: ProfileStatus } | null,
  role: AppRole,
) {
  return profile?.role === role && profile.status === "active";
}

export function isApprovedLender(
  profile: {
    role: AppRole;
    status: ProfileStatus;
    lenderProfile: { verification_status: LenderVerificationStatus } | null;
  } | null,
) {
  return (
    profile?.role === "lender" &&
    profile.status === "active" &&
    profile.lenderProfile?.verification_status === "approved"
  );
}
