import { LenderBottomTabs, LenderHeader } from "@/components/lender-bottom-tabs";
import {
  LenderApplicationsList,
  LenderApplicationsStatus,
} from "@/components/lender-applications-list";
import { loadOpenLenderApplications } from "@/lib/lender-applications";

export const dynamic = "force-dynamic";

export default async function LenderApplicationsPage() {
  const result = await loadOpenLenderApplications();

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
