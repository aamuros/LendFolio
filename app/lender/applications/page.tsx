import { redirect, RedirectType } from "next/navigation";
import { LenderBottomTabs } from "@/components/lender-bottom-tabs";
import { LenderPageHeader } from "@/components/lender-page-header";
import {
  LenderApplicationsList,
  LenderApplicationsStatus,
} from "@/components/lender-applications-list";
import { LenderAccessPanel } from "@/components/lender/lender-access-panel";
import { getCurrentUserProfile } from "@/lib/access-control";
import {
  buildConsentStatus,
} from "@/lib/consents";
import { loadUserConsents } from "@/lib/user-consents";
import { loadOpenLenderApplications } from "@/lib/lender-applications";
import { isApprovedLender } from "@/lib/role-rules";
import {
  getLenderVerificationDocuments,
  calculateLenderVerificationDocumentPolicy,
} from "@/lib/lender-verification";

export const dynamic = "force-dynamic";

export default async function LenderApplicationsPage() {
  const access = await getCurrentUserProfile();

  if (!access.ok) {
    return (
      <main className="min-h-svh bg-background">
        <div className="mx-auto max-w-7xl">
          <LenderPageHeader activeTab="applications" showNotifications={false} />
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
      redirect("/lender/onboarding", RedirectType.replace);
    }

    let lenderConsentStatus = buildConsentStatus("lender_review", []);
    let pendingDocuments: Awaited<ReturnType<typeof getLenderVerificationDocuments>> = [];
    let pendingDocumentPolicy = calculateLenderVerificationDocumentPolicy([]);

    try {
      lenderConsentStatus = buildConsentStatus(
        "lender_review",
        await loadUserConsents(access.supabase, access.profile.id),
      );

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
    } catch {
      // Data loading failed; render with empty defaults so the page
      // still shows the pending-review panel instead of the error boundary.
    }

    return (
      <main className="min-h-svh bg-background">
        <div className="mx-auto max-w-7xl">
          <LenderPageHeader activeTab="applications" showNotifications={false} />
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
        <LenderPageHeader activeTab="applications" />

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
