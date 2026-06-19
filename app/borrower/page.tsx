import { BorrowerWorkspace } from "@/components/borrower-workspace";
import { loadBorrowerLoanApplications } from "@/app/borrower/actions";
import { getBorrowerAccess } from "@/lib/borrower-access";
import { redirect, RedirectType } from "next/navigation";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        ) : access.reason === "unauthenticated" ? (
          <div className="grid gap-4 px-4 pt-16 sm:px-6 sm:pt-20">
            <div className="mx-auto grid max-w-sm gap-4 text-center">
              <LogIn className="mx-auto h-10 w-10 text-muted-foreground" />
              <h1 className="text-xl font-semibold">Session expired</h1>
              <p className="text-sm leading-6 text-muted-foreground">
                Your session has ended. Sign in again to continue where you left
                off.
              </p>
              <Button asChild className="mt-2 w-full rounded-xl">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>
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
