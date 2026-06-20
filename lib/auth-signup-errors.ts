import { SIGNUP_CONFIRMATION_SEND_FAILED_MESSAGE } from "@/lib/auth-confirmation";

type SignupAuthError = {
  code?: string | null;
  message?: string | null;
  name?: string | null;
  status?: number | null;
};

export type SignupErrorCode =
  | "SIGNUP_ENV_MISSING"
  | "SIGNUP_SUPABASE_CONFIG"
  | "SIGNUP_AUTH_PROVIDER"
  | "SIGNUP_DATABASE_TRIGGER"
  | "SIGNUP_REDIRECT_URL"
  | "SIGNUP_EMAIL_REGISTERED"
  | "SIGNUP_CONFIRMATION_SEND_FAILED"
  | "SIGNUP_UNEXPECTED";

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

export function logSignupDiagnosticFailure(
  error: unknown,
  errorCode: SignupErrorCode,
) {
  const details = getSignupErrorDetails(error);

  console.error("Signup failed", {
    message: details.message || "Unknown signup error",
    name: details.name || undefined,
    status: details.status || undefined,
    code: errorCode,
    sourceCode: details.code || undefined,
    cause: details.causeMessage || undefined,
  });
}

export function classifySignupError(error: unknown): SignupErrorCode {
  const details = getSignupErrorDetails(error);
  const message = details.searchText;
  const code = details.code.toLowerCase();
  const status = details.status;

  if (
    message.includes("next_public_supabase_url") ||
    message.includes("next_public_supabase_anon_key") ||
    message.includes("missing supabase")
  ) {
    return "SIGNUP_ENV_MISSING";
  }

  if (
    message.includes("invalid url") ||
    message.includes("supabaseurl is required") ||
    message.includes("supabasekey is required") ||
    message.includes("supabase url") ||
    message.includes("invalid api key") ||
    message.includes("invalid key") ||
    message.includes("unauthorized") ||
    message.includes("fetch failed") ||
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("localhost") ||
    message.includes("127.0.0.1") ||
    message.includes("jwt") ||
    message.includes("api key") ||
    code.includes("invalid_credentials") ||
    status === 401 ||
    status === 403
  ) {
    return "SIGNUP_SUPABASE_CONFIG";
  }

  if (
    message.includes("provider") ||
    message.includes("signup is disabled") ||
    message.includes("signups not allowed") ||
    message.includes("email signups are disabled") ||
    code.includes("signup_disabled")
  ) {
    return "SIGNUP_AUTH_PROVIDER";
  }

  if (
    message.includes("redirect") ||
    message.includes("not allowed") ||
    message.includes("site url") ||
    code.includes("redirect")
  ) {
    return "SIGNUP_REDIRECT_URL";
  }

  if (
    message.includes("already registered") ||
    message.includes("already exists") ||
    code.includes("user_already_exists")
  ) {
    return "SIGNUP_EMAIL_REGISTERED";
  }

  if (
    message.includes("database") ||
    message.includes("trigger") ||
    message.includes("profile") ||
    message.includes("saving new user") ||
    message.includes("violates") ||
    message.includes("function") ||
    code === "unexpected_failure" ||
    code === "database_error" ||
    code.startsWith("23") ||
    code.startsWith("42") ||
    status >= 500
  ) {
    return "SIGNUP_DATABASE_TRIGGER";
  }

  if (message.includes("authapierror") || status === 400 || status === 422) {
    return "SIGNUP_SUPABASE_CONFIG";
  }

  return "SIGNUP_UNEXPECTED";
}

export function getSafeSignupErrorMessage(errorCode: SignupErrorCode) {
  switch (errorCode) {
    case "SIGNUP_ENV_MISSING":
      return "Signup is not configured yet. Ask the site owner to verify the Supabase URL and anon key.";
    case "SIGNUP_SUPABASE_CONFIG":
      return "Signup cannot connect to the authentication service. Ask the site owner to verify the Supabase project settings.";
    case "SIGNUP_AUTH_PROVIDER":
      return "Email signup is not enabled yet. Ask the site owner to verify the Supabase email provider.";
    case "SIGNUP_DATABASE_TRIGGER":
      return "Signup reached the authentication service, but account setup could not finish. Ask the site owner to verify production database migrations.";
    case "SIGNUP_REDIRECT_URL":
      return "Signup needs the site redirect URL to be allowed before accounts can be created.";
    case "SIGNUP_EMAIL_REGISTERED":
      return "This email is already registered. Sign in or check your email for the confirmation link.";
    case "SIGNUP_CONFIRMATION_SEND_FAILED":
      return SIGNUP_CONFIRMATION_SEND_FAILED_MESSAGE;
    case "SIGNUP_UNEXPECTED":
    default:
      return "Signup could not be completed right now. Try again later or contact support.";
  }
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

function getSignupErrorDetails(error: unknown, depth = 0): {
  message: string;
  code: string;
  name: string;
  status: number;
  causeMessage: string;
  searchText: string;
} {
  if (depth > 3) {
    return {
      message: "",
      code: "",
      name: "",
      status: 0,
      causeMessage: "",
      searchText: "",
    };
  }

  const record =
    error && typeof error === "object"
      ? (error as Record<string, unknown>)
      : null;
  const message =
    error instanceof Error
      ? error.message
      : record && "message" in record
        ? String(record.message ?? "")
        : typeof error === "string"
          ? error
          : "";
  const code =
    record && "code" in record ? String(record.code ?? "") : "";
  const name =
    error instanceof Error
      ? error.name
      : record && "name" in record
        ? String(record.name ?? "")
        : "";
  const statusValue = record && "status" in record ? Number(record.status) : 0;
  const status = Number.isFinite(statusValue) ? statusValue : 0;
  const cause = record && "cause" in record ? record.cause : undefined;
  const causeDetails =
    cause === undefined
      ? null
      : getSignupErrorDetails(cause, depth + 1);
  const nestedError = record && "error" in record ? record.error : undefined;
  const nestedDetails =
    nestedError === undefined
      ? null
      : getSignupErrorDetails(nestedError, depth + 1);
  const errors = Array.isArray(record?.errors)
    ? record.errors
        .map((item) => getSignupErrorDetails(item, depth + 1).searchText)
        .join(" ")
    : "";
  const causeMessage = causeDetails?.message || nestedDetails?.message || "";
  const searchText = [
    message,
    code,
    name,
    status ? String(status) : "",
    causeDetails?.searchText,
    nestedDetails?.searchText,
    errors,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return {
    message,
    code,
    name,
    status,
    causeMessage,
    searchText,
  };
}
