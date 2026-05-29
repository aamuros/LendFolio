import Link from "next/link";
import { ResetPasswordForm } from "@/app/reset-password/reset-password-form";
import { ArrowLeft } from "lucide-react";

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    code?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const code = params?.code ?? "";

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
        <ResetPasswordForm code={code} />
      </div>
    </div>
  );
}
