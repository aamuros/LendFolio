import type { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserConsentRecord } from "@/lib/consents";

export async function loadUserConsents(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
): Promise<UserConsentRecord[]> {
  const { data, error } = await supabase
    .from("user_consents")
    .select("consent_type, version, accepted_at")
    .eq("user_id", userId)
    .order("accepted_at", { ascending: false });

  if (error) {
    return [];
  }

  return data.map((consent) => ({
    consentType: consent.consent_type,
    version: consent.version,
    acceptedAt: consent.accepted_at,
  }));
}
