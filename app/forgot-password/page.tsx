import Link from "next/link";
import { ForgotPasswordForm } from "@/app/forgot-password/forgot-password-form";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to login
        </Link>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
