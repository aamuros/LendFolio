import { redirect } from "next/navigation";
import { LenderBottomTabs, LenderHeader } from "@/components/lender-bottom-tabs";
import {
  LenderApplicationsList,
  LenderApplicationsStatus,
} from "@/components/lender-applications-list";
import { LenderAccessPanel } from "@/components/lender/lender-access-panel";
import { getCurrentUserProfile } from "@/lib/access-control";
import {
  buildConsentStatus,
  type UserConsentRecord,
} from "@/lib/consents";
import { loadOpenLenderApplications } from "@/lib/lender-applications";
import { isApprovedLender } from "@/lib/role-rules";
import {
  getLenderVerificationDocuments,
  calculateLenderVerificationDocumentPolicy,
} from "@/lib/lender-verification";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LenderApplicationsPage() {
  const access = await getCurrentUserProfile();

  if (!access.ok) {
    return (
      <main className="min-h-svh bg-background">
        <div className="mx-auto max-w-7xl">
          <LenderHeader activeTab="applications" showNotifications={false} />
          <div className="px-5 pt-6 pb-36 sm:px-8 sm:pt-10">
            <LenderApplicationsStatus message={access.message} tone="error" />
          </div>
          <div className="sm:hidden">
            <LenderBottomTabs activeTab="applications" />
          </div>
        </div>
      </main>
    );
  }

  if (!isApprovedLender(access.profile)) {
    if (
      access.profile.role === "lender" &&
      (access.profile.lenderProfile?.verification_status === "incomplete" ||
        !access.profile.lenderProfile)
    ) {
      redirect("/lender/onboarding");
    }

    const lenderConsentStatus = buildConsentStatus(
      "lender_review",
      await loadUserConsents(access.supabase, access.profile.id),
    );

    let pendingDocuments: Awaited<ReturnType<typeof getLenderVerificationDocuments>> = [];
    let pendingDocumentPolicy = calculateLenderVerificationDocumentPolicy([]);

    const pendingLenderProfileId = access.profile.lenderProfile?.id;
    if (pendingLenderProfileId) {
      pendingDocuments = await getLenderVerificationDocuments(
        access.supabase,
        pendingLenderProfileId,
        access.profile.id,
      );
      pendingDocumentPolicy =
        calculateLenderVerificationDocumentPolicy(pendingDocuments);
    }

    return (
      <main className="min-h-svh bg-background">
        <div className="mx-auto max-w-7xl">
          <LenderHeader activeTab="applications" showNotifications={false} />
          <div className="px-5 pt-6 pb-36 sm:px-8 sm:pt-10">
            <LenderAccessPanel
              profile={access.profile}
              consentStatus={lenderConsentStatus}
              documents={pendingDocuments}
              documentPolicy={pendingDocumentPolicy}
            />
          </div>
          <div className="sm:hidden">
            <LenderBottomTabs activeTab="applications" />
          </div>
        </div>
      </main>
    );
  }

  const result = await loadOpenLenderApplications(access);

  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto max-w-7xl">
        <LenderHeader activeTab="applications" />

        <div className="px-5 pt-6 pb-36 sm:px-8 sm:pt-10">
          <section className="grid gap-5">
            <div className="grid gap-1">
              <h1 className="text-xl font-semibold sm:text-2xl">
                Open applications
              </h1>
              <p className="text-sm text-muted-foreground">
                Review borrower context and send terms when there is a fit.
              </p>
            </div>

            {!result.ok ? (
              <LenderApplicationsStatus message={result.message} tone="error" />
            ) : null}
            <LenderApplicationsList applications={result.applications} />
          </section>
        </div>

        <div className="sm:hidden">
          <LenderBottomTabs activeTab="applications" />
        </div>
      </div>
    </main>
  );
}

async function loadUserConsents(
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
