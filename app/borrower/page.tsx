import { BorrowerWorkspace } from "@/components/borrower-workspace";
import { loadBorrowerLoanApplications } from "@/app/borrower/actions";
import { getBorrowerAccess } from "@/lib/borrower-access";
import { redirect, RedirectType } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { BorrowerTab } from "@/components/borrower-bottom-tabs";

export const dynamic = "force-dynamic";

const validBorrowerTabs = new Set<BorrowerTab>([
  "home",
  "apply",
  "offers",
  "loans",
  "profile",
]);

export default async function BorrowerPage({
  searchParams,
}: {
  searchParams: Promise<{
    message?: string;
    tab?: string;
    offerId?: string;
    applicationId?: string;
    loanId?: string;
    repaymentId?: string;
    proofId?: string;
    accepted?: string;
  }>;
}) {
  const {
    message,
    tab,
    offerId,
    applicationId,
    loanId,
    repaymentId,
    proofId,
    accepted,
  } = await searchParams;

  if (message === "signed-in") {
    redirect("/borrower", RedirectType.replace);
  }

  const initialTab: BorrowerTab =
    tab && validBorrowerTabs.has(tab as BorrowerTab) ? (tab as BorrowerTab) : "home";

  if (initialTab === "offers" && offerId) {
    redirect(`/borrower/offers/${offerId}`, RedirectType.replace);
  }

  const access = await getBorrowerAccess();
  const user = access.ok
    ? (await access.supabase.auth.getSession()).data.session?.user ?? null
    : null;
  const initialLoanApplications = access.ok
    ? await loadBorrowerLoanApplications(access)
    : null;

  return (
    <main className="theme-lendfolio min-h-svh bg-background text-foreground">
      <div className="mx-auto max-w-7xl">
        {access.ok ? (
          <BorrowerWorkspace
            accountEmail={user?.email ?? ""}
            initialLoanApplications={initialLoanApplications}
            initialTab={initialTab}
            highlightOfferId={offerId ?? null}
            highlightApplicationId={applicationId ?? null}
            highlightLoanId={loanId ?? null}
            highlightRepaymentId={repaymentId ?? null}
            highlightProofId={proofId ?? null}
            initialLoanMessage={
              accepted === "1"
                ? "Offer accepted. Your loan is waiting for fund release."
                : ""
            }
          />
        ) : (
          <div className="px-4 pt-6 sm:px-6 sm:pt-8">
            <Alert variant="destructive" role="alert">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{access.message}</AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </main>
  );
}
