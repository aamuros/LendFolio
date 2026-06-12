import { redirect, RedirectType } from "next/navigation";
import { SignupForm } from "@/app/signup/signup-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getCurrentUserProfile } from "@/lib/access-control";
import { getRouteForRole } from "@/lib/app-roles";

export default async function SignupPage() {
  const access = await getCurrentUserProfile();
  if (access.ok && access.profile.status === "active") {
    redirect(getRouteForRole(access.profile.role), RedirectType.replace);
  }

  return (
    <AuthShell maxWidth="max-w-lg">
      <SignupForm />
    </AuthShell>
  );
}
