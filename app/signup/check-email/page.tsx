import Link from "next/link";
import { MailCheck } from "lucide-react";
import { SignupConfirmationPanel } from "@/app/signup/check-email/signup-confirmation-panel";
import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SignupCheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{
    email?: string;
    status?: string;
  }>;
}) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email.trim().toLowerCase() : "";
  const status = params.status;

  return (
    <AuthShell maxWidth="max-w-lg">
      <Card className="rounded-3xl border border-[#D9D7D1]/90 bg-[#FFFFFC]/94 p-5 shadow-[0_22px_70px_rgba(14,26,18,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md sm:p-6">
        <CardHeader className="items-center p-0 text-center">
          <div className="mb-1 flex size-12 items-center justify-center rounded-full bg-[#E6DDCB] text-[#33423C]">
            <MailCheck className="size-6" />
          </div>
          <CardTitle className="text-2xl font-semibold tracking-[-0.02em] text-[#161616]">
            Check your email
          </CardTitle>
          <CardDescription className="text-[#55534F]">
            Confirm your account to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 p-0">
          <Alert>
            <MailCheck className="size-4" />
            <AlertTitle>Confirmation email</AlertTitle>
            <AlertDescription>
              {getConfirmationMessage(status)}
              {email ? (
                <span className="mt-2 block break-all font-medium text-[#161616]">
                  {email}
                </span>
              ) : null}
            </AlertDescription>
          </Alert>

          {email ? (
            <SignupConfirmationPanel email={email} />
          ) : (
            <Button asChild className="h-11 rounded-xl font-semibold">
              <Link href="/signup">Back to signup</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </AuthShell>
  );
}

function getConfirmationMessage(status?: string) {
  if (status === "delivery_failed") {
    return "Your account details were submitted, but the first email may not have been sent. Use resend confirmation.";
  }

  if (status === "pending") {
    return "This email already has a pending confirmation. Use resend confirmation if the email did not arrive.";
  }

  return "We sent a confirmation link to this email.";
}
