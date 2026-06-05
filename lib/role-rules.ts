import type { AppRole, LenderVerificationStatus, ProfileStatus } from "./supabase/types";

export function hasRole(
  profile: { role: AppRole; additional_roles: AppRole[]; status: ProfileStatus } | null,
  role: AppRole,
) {
  if (!profile || profile.status !== "active") return false;
  return profile.role === role || profile.additional_roles.includes(role);
}

export function canAccessRole(
  profile: { role: AppRole; additional_roles: AppRole[]; status: ProfileStatus } | null,
  role: AppRole,
) {
  return hasRole(profile, role);
}

export function isApprovedLender(
  profile: {
    role: AppRole;
    additional_roles: AppRole[];
    status: ProfileStatus;
    lenderProfile: { verification_status: LenderVerificationStatus } | null;
  } | null,
) {
  return (
    hasRole(profile, "lender") &&
    profile?.lenderProfile?.verification_status === "approved"
  );
}
