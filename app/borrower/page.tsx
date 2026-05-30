import { BorrowerWorkspace } from "@/components/borrower-workspace";
import { loadBorrowerLoanApplications } from "@/app/borrower/actions";
import { requireBorrower } from "@/lib/access-control";
import { redirect } from "next/navigation";
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
  } = await searchParams;

  if (message === "signed-in") {
    redirect("/borrower");
  }

  const initialTab: BorrowerTab =
    tab && validBorrowerTabs.has(tab as BorrowerTab) ? (tab as BorrowerTab) : "home";

  const access = await requireBorrower();
  const {
    data: { user },
  } = access.ok ? await access.supabase.auth.getUser() : { data: { user: null } };
  const initialLoanApplications = access.ok
    ? await loadBorrowerLoanApplications()
    : null;

  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto max-w-6xl px-5 pt-6 pb-36 sm:px-8 sm:pt-10">
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
          />
        ) : (
          <Alert variant="destructive" role="alert">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{access.message}</AlertDescription>
          </Alert>
        )}
      </div>
    </main>
  );
}
