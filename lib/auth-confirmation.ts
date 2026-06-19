type EmailConfirmationUser = {
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
};

export const EMAIL_VERIFICATION_REQUIRED_MESSAGE =
  "Confirm your email before opening your workspace. Check your inbox for the confirmation link, then sign in again.";

export const EMAIL_VERIFICATION_LOGIN_MESSAGE =
  "Confirm your email before signing in. Check your inbox for the confirmation link, then try again.";

export const SIGNUP_CHECK_EMAIL_MESSAGE =
  "Account created. Check your email to confirm your account, then sign in to continue.";

export const SIGNUP_CONFIRMATION_PENDING_MESSAGE =
  "Account already created. Check your email to confirm your account, then sign in to continue.";

export const SIGNUP_CONFIRMATION_SEND_FAILED_MESSAGE =
  "Account was created, but the confirmation email could not be sent. Try again in a minute.";

export function hasConfirmedEmail(user: EmailConfirmationUser | null | undefined) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
}

export function isSignupConfirmationPendingError(
  error: { code?: string; message?: string } | null | undefined,
) {
  const code = error?.code?.toLowerCase() ?? "";
  const message = error?.message?.toLowerCase() ?? "";

  return (
    code === "user_already_exists" ||
    code === "email_exists" ||
    message.includes("user already registered") ||
    message.includes("already registered") ||
    message.includes("already exists")
  );
}

export function isSignupConfirmationDeliveryError(
  error: { code?: string; message?: string } | null | undefined,
) {
  const code = error?.code?.toLowerCase() ?? "";
  const message = error?.message?.toLowerCase() ?? "";

  return (
    code === "email_provider_disabled" ||
    (message.includes("confirmation") && message.includes("email")) ||
    (message.includes("confirmation") && message.includes("mail")) ||
    (message.includes("send") && message.includes("email")) ||
    (message.includes("send") && message.includes("mail")) ||
    message.includes("smtp")
  );
}
