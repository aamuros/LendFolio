import Link from "next/link";
import { redirect, RedirectType } from "next/navigation";
import { LoginForm } from "@/app/login/login-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getCurrentUserProfile } from "@/lib/access-control";
import { getRouteForRole } from "@/lib/app-roles";

export default async function LoginPage() {
  const access = await getCurrentUserProfile();
  if (access.ok && access.profile.status === "active") {
    redirect(getRouteForRole(access.profile.role), RedirectType.replace);
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 w-fit rounded-full text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link href="/">
            <ArrowLeft className="size-4" />
            Back to home
          </Link>
        </Button>
        <LoginForm />
      </div>
    </div>
  );
}
