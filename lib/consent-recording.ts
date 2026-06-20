import {
  CURRENT_CONSENT_VERSIONS,
  getRequiredConsentVersions,
  hasCurrentRequiredConsents,
  toConsentRpcPayload,
} from "@/lib/consents";
import type { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type RequestHeaderReader = Pick<Headers, "get">;

export function getConsentRequestMetadata(requestHeaders: RequestHeaderReader) {
  return {
    ipAddress:
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      requestHeaders.get("x-real-ip") ||
      null,
    userAgent: requestHeaders.get("user-agent") ?? null,
  };
}

export function getSignupConsentMetadata(requestHeaders: RequestHeaderReader) {
  const { ipAddress, userAgent } = getConsentRequestMetadata(requestHeaders);

  return {
    signup_terms_accepted: true,
    signup_privacy_accepted: true,
    signup_terms_version: CURRENT_CONSENT_VERSIONS.terms_of_service,
    signup_privacy_version: CURRENT_CONSENT_VERSIONS.privacy_notice,
    signup_consent_ip_address: ipAddress,
    signup_consent_user_agent: userAgent,
  };
}

export async function acceptBaselineUserConsents(
  supabase: SupabaseServerClient,
  requestHeaders: RequestHeaderReader,
) {
  const requiredConsents = getRequiredConsentVersions("signup_baseline");
  const { data: existingConsents, error: existingConsentsError } = await supabase
    .from("user_consents")
    .select("consent_type, version, accepted_at")
    .in(
      "consent_type",
      requiredConsents.map((consent) => consent.consentType),
    );

  if (
    !existingConsentsError &&
    hasCurrentRequiredConsents(
      existingConsents.map((consent) => ({
        consentType: consent.consent_type,
        version: consent.version,
        acceptedAt: consent.accepted_at,
      })),
      requiredConsents,
    )
  ) {
    return true;
  }

  const { ipAddress, userAgent } = getConsentRequestMetadata(requestHeaders);
  const { data, error } = await supabase.rpc("accept_user_consents", {
    p_consents: toConsentRpcPayload(requiredConsents) as Json,
    p_ip_address: ipAddress,
    p_user_agent: userAgent,
  });
  const result = data as { ok?: boolean } | null;

  return !error && result?.ok === true;
}
