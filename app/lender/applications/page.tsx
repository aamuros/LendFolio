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
    <main className="min-h-svh px-5 pt-4 pb-32 sm:px-8 sm:pt-6 sm:pb-8">
      <div className="mx-auto grid max-w-4xl gap-5">
        <LenderHeader activeTab="applications" />

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

        <LenderBottomTabs activeTab="applications" />
      </div>
    </main>
  );
}
