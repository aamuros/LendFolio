import { redirect, RedirectType } from "next/navigation";
import { LoginForm } from "@/app/login/login-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getCurrentUserProfile } from "@/lib/access-control";
import { getRouteForRole } from "@/lib/app-roles";
import { EMAIL_VERIFICATION_LOGIN_MESSAGE } from "@/lib/auth-confirmation";

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
  const emailVerificationNotice =
    !notice && !access.ok && access.reason === "email_unverified"
      ? ({
          status: "error",
          message: EMAIL_VERIFICATION_LOGIN_MESSAGE,
        } satisfies LoginNotice)
      : null;
  const visibleNotice = notice ?? emailVerificationNotice;

  if (!visibleNotice && access.ok && access.profile.status === "active") {
    redirect(getRouteForRole(access.profile.role), RedirectType.replace);
  }

  return (
    <AuthShell maxWidth="max-w-sm">
      <LoginForm notice={visibleNotice} />
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

  if (params.message === "verify-email") {
    return {
      status: "error",
      message: EMAIL_VERIFICATION_LOGIN_MESSAGE,
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
