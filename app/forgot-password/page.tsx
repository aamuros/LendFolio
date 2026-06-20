import { ForgotPasswordForm } from "@/app/forgot-password/forgot-password-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function ForgotPasswordPage() {
  return (
    <AuthShell maxWidth="max-w-sm">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
