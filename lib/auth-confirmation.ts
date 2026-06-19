type EmailConfirmationUser = {
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
};

export const EMAIL_VERIFICATION_REQUIRED_MESSAGE =
  "Confirm your email before opening your workspace. Check your inbox for the confirmation link, then sign in again.";

export const EMAIL_VERIFICATION_LOGIN_MESSAGE =
  "Confirm your email before signing in. Check your inbox for the confirmation link, then try again.";

export function hasConfirmedEmail(user: EmailConfirmationUser | null | undefined) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
}
