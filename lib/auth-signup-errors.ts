type SignupAuthError = {
  code?: string | null;
  message?: string | null;
  name?: string | null;
  status?: number | null;
};

export const SIGNUP_ACCOUNT_CREATION_FAILED_MESSAGE =
  "Could not create the account. Try another email or password.";

export const SIGNUP_ACCOUNT_SETUP_UNAVAILABLE_MESSAGE =
  "Account setup is temporarily unavailable. Try again later.";

export function getSignupFailureMessage(error: SignupAuthError | null | undefined) {
  return isSignupDatabaseFailure(error)
    ? SIGNUP_ACCOUNT_SETUP_UNAVAILABLE_MESSAGE
    : SIGNUP_ACCOUNT_CREATION_FAILED_MESSAGE;
}

export function logSignupFailure(
  context: {
    flow: "signup" | "lender_register";
    role: "borrower" | "lender";
  },
  error: SignupAuthError | null | undefined,
) {
  console.error("[auth-signup]", {
    flow: context.flow,
    role: context.role,
    code: error?.code ?? null,
    name: error?.name ?? null,
    status: error?.status ?? null,
    message: sanitizeSignupErrorMessage(error?.message),
  });
}

function isSignupDatabaseFailure(error: SignupAuthError | null | undefined) {
  const code = error?.code?.toLowerCase() ?? "";
  const message = error?.message?.toLowerCase() ?? "";

  return (
    code === "unexpected_failure" ||
    code === "database_error" ||
    message.includes("database error saving new user") ||
    (message.includes("database") && message.includes("saving new user"))
  );
}

function sanitizeSignupErrorMessage(message: string | null | undefined) {
  const normalized = message
    ?.replace(/\s+/g, " ")
    .replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      "[redacted-email]",
    )
    .trim();

  return normalized ? normalized.slice(0, 300) : null;
}
