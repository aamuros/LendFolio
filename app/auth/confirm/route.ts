import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_CONFIRMED_REDIRECT = "/login?message=email-confirmed";
const INVALID_CONFIRMATION_REDIRECT = "/login?error=confirmation_failed";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const redirectUrl = getSafeRedirectUrl(
    requestUrl.searchParams.get("next"),
    requestUrl,
  );

  if (!code && (!tokenHash || !type)) {
    return redirectToInvalidConfirmation(requestUrl);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } =
      tokenHash && type
        ? await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          })
        : await supabase.auth.exchangeCodeForSession(code ?? "");

    if (error) {
      return redirectToInvalidConfirmation(requestUrl);
    }

    if (redirectUrl.pathname === "/login") {
      try {
        await supabase.auth.signOut();
      } catch {
        // Confirmation succeeded; clearing the temporary session is best effort.
      }
    }

    return NextResponse.redirect(redirectUrl, { status: 303 });
  } catch {
    return redirectToInvalidConfirmation(requestUrl);
  }
}

function redirectToInvalidConfirmation(requestUrl: URL) {
  return NextResponse.redirect(
    new URL(INVALID_CONFIRMATION_REDIRECT, requestUrl.origin),
    { status: 303 },
  );
}

function getSafeRedirectUrl(next: string | null, requestUrl: URL) {
  const fallback = new URL(DEFAULT_CONFIRMED_REDIRECT, requestUrl.origin);

  if (!next) {
    return fallback;
  }

  try {
    const url = new URL(next, requestUrl.origin);
    return url.origin === requestUrl.origin ? url : fallback;
  } catch {
    return fallback;
  }
}
