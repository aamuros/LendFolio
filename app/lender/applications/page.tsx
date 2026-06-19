import { LenderBottomTabs } from "@/components/lender-bottom-tabs";
import { LenderPageHeader } from "@/components/lender-page-header";
import {
  LenderApplicationsList,
  LenderApplicationsStatus,
} from "@/components/lender-applications-list";
import {
  LENDER_OFFER_VERIFICATION_REQUIRED_MESSAGE,
  requirePrimaryRole,
} from "@/lib/access-control";
import { loadOpenLenderApplications } from "@/lib/lender-applications";
import { isApprovedLender } from "@/lib/role-rules";
import { PageHeader, borrowerPageBottomPadding } from "@/components/borrower/ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LenderApplicationsPage() {
  const access = await requirePrimaryRole("lender");

  if (!access.ok) {
    return (
      <main className="theme-lendfolio min-h-svh bg-background text-foreground">
        <LenderPageHeader activeTab="applications" />
        <div className="mx-auto w-full max-w-[1700px]">
          <div className={cn("px-4 pt-4 sm:px-6 sm:pt-6", borrowerPageBottomPadding)}>
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
    return (
      <main className="theme-lendfolio min-h-svh bg-background text-foreground">
        <LenderPageHeader activeTab="applications" />
        <div className="mx-auto w-full max-w-[1700px]">
          <div className={cn("px-4 pt-4 sm:px-6 sm:pt-6", borrowerPageBottomPadding)}>
            <section className="grid gap-5">
              <PageHeader
                title="Open applications"
                description="Review borrower requests once your lender account is approved."
              />
              <LenderApplicationsStatus
                message={LENDER_OFFER_VERIFICATION_REQUIRED_MESSAGE}
                tone="error"
              />
              <LenderApplicationsList
                applications={[]}
                emptyTitle="No applications yet"
                emptyDescription="Applications from borrowers will appear here once your lender account is approved."
              />
            </section>
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
    <main className="theme-lendfolio min-h-svh bg-background text-foreground">
      <LenderPageHeader activeTab="applications" />
      <div className="mx-auto w-full max-w-[1700px]">
        <div className={cn("px-4 pt-4 sm:px-6 sm:pt-6", borrowerPageBottomPadding)}>
          <section className="grid gap-5">
            <PageHeader
              title="Open applications"
              description="Review borrower context and send terms when there is a fit."
            />

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
