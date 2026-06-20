import { ResetPasswordForm } from "@/app/reset-password/reset-password-form";
import { AuthShell } from "@/components/auth/auth-shell";

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
    <AuthShell maxWidth="max-w-sm">
      <ResetPasswordForm code={code} />
    </AuthShell>
  );
}
