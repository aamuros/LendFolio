import Link from "next/link";
import { redirect, RedirectType } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LenderBottomTabs } from "@/components/lender-bottom-tabs";
import { LenderPageHeader } from "@/components/lender-page-header";
import { LenderLoanDetail } from "@/components/lender-loan-details";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LenderApplicationsStatus } from "@/components/lender-applications-list";
import { requirePrimaryRole } from "@/lib/access-control";
import { loadLenderOffers } from "@/lib/lender-applications";
import { isApprovedLender } from "@/lib/role-rules";
import { cn } from "@/lib/utils";
import { borrowerPageBottomPadding } from "@/components/borrower/ui";

export const dynamic = "force-dynamic";

export default async function LenderLoanDetailPage({
  params,
}: {
  params: Promise<{ loanId: string }>;
}) {
  const { loanId } = await params;
  const access = await requirePrimaryRole("lender");

  if (!access.ok) {
    return (
      <main className="theme-lendfolio min-h-svh bg-background text-foreground">
        <LenderPageHeader activeTab="loans" />
        <div className="mx-auto w-full max-w-7xl">
          <div className={cn("px-4 pt-3 sm:px-6 sm:pt-5", borrowerPageBottomPadding)}>
            <LenderApplicationsStatus message={access.message} tone="error" />
          </div>
          <div className="sm:hidden">
            <LenderBottomTabs activeTab="loans" />
          </div>
        </div>
      </main>
    );
  }

  if (!isApprovedLender(access.profile)) {
    if (
      access.profile.role === "lender" &&
      !access.profile.lenderProfile
    ) {
      redirect("/lender", RedirectType.replace);
    }

    return (
      <main className="theme-lendfolio min-h-svh bg-background text-foreground">
        <LenderPageHeader activeTab="loans" />
        <div className="mx-auto w-full max-w-7xl">
          <div className={cn("px-4 pt-3 sm:px-6 sm:pt-5", borrowerPageBottomPadding)}>
            <UnavailableLoanState
              title="Loan unavailable"
              description="Approved lender access is required to view loan details."
            />
          </div>
          <div className="sm:hidden">
            <LenderBottomTabs activeTab="loans" />
          </div>
        </div>
      </main>
    );
  }

  const offersResult = await loadLenderOffers(access);
  const offer = offersResult.ok
    ? offersResult.offers.find((item) => item.activeLoan?.id === loanId)
    : null;

  return (
    <main className="theme-lendfolio min-h-svh bg-background text-foreground">
      <LenderPageHeader activeTab="loans" />
      <div className="mx-auto w-full max-w-7xl">
        <div className={cn("px-4 pt-3 sm:px-6 sm:pt-5", borrowerPageBottomPadding)}>
          {!offersResult.ok ? (
            <LenderApplicationsStatus message={offersResult.message} tone="error" />
          ) : offer ? (
            <LenderLoanDetail offer={offer} />
          ) : (
            <UnavailableLoanState
              title="Loan unavailable"
              description="This loan could not be found in your active loan list."
            />
          )}
        </div>
        <div className="sm:hidden">
          <LenderBottomTabs activeTab="loans" />
        </div>
      </div>
    </main>
  );
}

function UnavailableLoanState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <Card className="rounded-2xl border-dashed border-border/50">
      <CardContent className="grid gap-4 p-5 text-center">
        <div className="grid gap-2">
          <p className="text-lg font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button asChild variant="outline" className="mx-auto h-10 rounded-xl">
          <Link href="/lender?tab=loans">
            <ArrowLeft className="size-4" />
            Back to loans
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
