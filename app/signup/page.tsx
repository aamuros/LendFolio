import Link from "next/link";
import { UserRound } from "lucide-react";
import { signOutForSignupAction } from "@/app/signup/actions";
import { SignupForm } from "@/app/signup/signup-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUserProfile } from "@/lib/access-control";
import { getRouteForRole, getWorkspaceConfig } from "@/lib/app-roles";

export default async function SignupPage() {
  const access = await getCurrentUserProfile();
  if (access.ok && access.profile.status === "active") {
    const workspace = getWorkspaceConfig(access.profile.role);
    const roleLabel = workspace?.role ?? access.profile.role;
    const workspaceRoute = getRouteForRole(access.profile.role);

    return (
      <AuthShell maxWidth="max-w-lg">
        <Card className="rounded-3xl border border-[#D9D7D1]/90 bg-[#FFFFFC]/94 p-5 shadow-[0_22px_70px_rgba(14,26,18,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md sm:p-6">
          <CardHeader className="p-0 text-center">
            <CardTitle className="text-2xl font-semibold tracking-[-0.02em] text-[#161616]">
              Account already signed in
            </CardTitle>
            <CardDescription className="text-[#55534F]">
              Continue with this account or sign out first.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-0">
            <Alert>
              <UserRound className="size-4" />
              <AlertTitle>You are signed in as {roleLabel}.</AlertTitle>
              <AlertDescription>
                To create a different account, sign out before choosing another role.
              </AlertDescription>
            </Alert>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button asChild className="h-11 rounded-xl font-semibold">
                <Link href={workspaceRoute}>Continue to workspace</Link>
              </Button>
              <form action={signOutForSignupAction}>
                <Button
                  type="submit"
                  variant="outline"
                  className="h-11 w-full rounded-xl font-semibold"
                >
                  Sign out and create account
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell maxWidth="max-w-lg">
      <SignupForm />
    </AuthShell>
  );
}
