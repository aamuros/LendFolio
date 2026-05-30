import Link from "next/link";
import { redirect } from "next/navigation";
import { LenderBottomTabs, LenderHeader } from "@/components/lender-bottom-tabs";
import {
  LenderApplicationsList,
  LenderApplicationsStatus,
} from "@/components/lender-applications-list";
import { ConsentAcceptancePanel } from "@/components/consent-acceptance-panel";
import { Button } from "@/components/ui/button";
import { getCurrentUserProfile } from "@/lib/access-control";
import {
  buildConsentStatus,
  type UserConsentRecord,
} from "@/lib/consents";
import { loadOpenLenderApplications } from "@/lib/lender-applications";
import { isApprovedLender } from "@/lib/role-rules";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LenderApplicationsPage() {
  const access = await getCurrentUserProfile();

  if (!access.ok) {
    return (
      <main className="min-h-svh bg-background">
        <div className="mx-auto max-w-7xl">
          <LenderHeader activeTab="applications" showNotifications={false} />
          <div className="px-4 pt-6 pb-32 sm:px-6 sm:pt-8">
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

    const message =
      access.profile.role === "lender" &&
      access.profile.lenderProfile?.verification_status === "pending"
        ? "Your lender access is pending review. You will be able to continue when your account is approved."
        : access.profile.role === "lender" &&
            access.profile.lenderProfile?.verification_status === "rejected"
          ? "Your lender access was not approved. Update your lender profile to resubmit."
          : "Your account does not have access to this workspace.";

    return (
      <main className="min-h-svh bg-background">
        <div className="mx-auto max-w-7xl">
          <LenderHeader activeTab="applications" showNotifications={false} />
          <div className="px-4 pt-6 pb-32 sm:px-6 sm:pt-8">
            <div className="grid gap-5">
              <LenderApplicationsStatus message={message} tone="error" />
              {access.profile.role === "lender" &&
              access.profile.lenderProfile?.verification_status === "rejected" ? (
                <Button asChild className="h-11 w-full rounded-full font-semibold sm:w-fit">
                  <Link href="/lender/onboarding">Update lender profile</Link>
                </Button>
              ) : null}
              {access.profile.role === "lender" ? (
                <ConsentAcceptancePanel
                  scope="lender_review"
                  status={lenderConsentStatus}
                />
              ) : null}
            </div>
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

        <div className="px-4 pt-6 pb-32 sm:px-6 sm:pt-8">
          <div className="mx-auto grid max-w-4xl gap-5">
            <section className="grid gap-4">
              <div className="grid gap-1">
                <h1 className="text-2xl leading-tight font-semibold">
                  Open applications
                </h1>
                <p className="text-sm leading-6 text-muted-foreground">
                  Review borrower context and send terms when there is a fit.
                </p>
              </div>

              {!result.ok ? (
                <LenderApplicationsStatus message={result.message} tone="error" />
              ) : null}
              <LenderApplicationsList applications={result.applications} />
            </section>
          </div>
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
