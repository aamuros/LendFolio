import { redirect, RedirectType } from "next/navigation";
import { LoginForm } from "@/app/login/login-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getCurrentUserProfile } from "@/lib/access-control";
import { getRouteForRole } from "@/lib/app-roles";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    message?: string;
    error?: string;
    error_code?: string;
    error_description?: string;
  }>;
}) {
  const params = await searchParams;
  const notice = getLoginNotice(params);
  const access = await getCurrentUserProfile();
  if (!notice && access.ok && access.profile.status === "active") {
    redirect(getRouteForRole(access.profile.role), RedirectType.replace);
  }

  return (
    <AuthShell maxWidth="max-w-sm">
      <LoginForm notice={notice} />
    </AuthShell>
  );
}

type LoginNotice = {
  message: string;
  status: "error" | "success";
};

function getLoginNotice(params: {
  message?: string;
  error?: string;
  error_code?: string;
  error_description?: string;
}): LoginNotice | null {
  if (params.message === "email-confirmed") {
    return {
      status: "success",
      message: "Email confirmed. Sign in to continue.",
    };
  }

  const errorCode = params.error_code?.toLowerCase() ?? "";
  const errorDescription = params.error_description?.toLowerCase() ?? "";

  if (
    params.error ||
    errorCode === "otp_expired" ||
    errorDescription.includes("invalid") ||
    errorDescription.includes("expired")
  ) {
    return {
      status: "error",
      message: "This confirmation link is invalid or has expired.",
    };
  }

  return null;
}
