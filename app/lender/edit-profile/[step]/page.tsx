import { notFound, redirect, RedirectType } from "next/navigation";
import { LenderBottomTabs } from "@/components/lender-bottom-tabs";
import { LenderPageHeader } from "@/components/lender-page-header";
import {
  LenderDetailsCompletionForm,
  type LenderDetailsStep,
} from "@/components/lender/lender-details-completion-form";
import { LenderApplicationsStatus } from "@/components/lender-applications-list";
import { borrowerPageBottomPadding } from "@/components/borrower/ui";
import { getCurrentUserProfile } from "@/lib/access-control";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type LenderEditProfileStepPageProps = {
  params: Promise<{
    step: string;
  }>;
};

const validSteps: LenderDetailsStep[] = ["organization", "lending", "review"];

export default async function LenderEditProfileStepPage({
  params,
}: LenderEditProfileStepPageProps) {
  const { step: rawStep } = await params;
  const step = validSteps.includes(rawStep as LenderDetailsStep)
    ? (rawStep as LenderDetailsStep)
    : null;

  if (!step) {
    notFound();
  }

  const access = await getCurrentUserProfile();

  if (!access.ok) {
    return (
      <main className="theme-lendfolio min-h-svh bg-background text-foreground">
        <LenderPageHeader activeTab="profile" />
        <div className="mx-auto max-w-7xl">
          <div className={cn("px-4 pt-4 sm:px-6 sm:pt-6", borrowerPageBottomPadding)}>
            <LenderApplicationsStatus message={access.message} tone="error" />
          </div>
          <div className="sm:hidden">
            <LenderBottomTabs activeTab="profile" />
          </div>
        </div>
      </main>
    );
  }

  if (access.profile.role !== "lender") {
    redirect("/lender", RedirectType.replace);
  }

  if (!access.profile.lenderProfile) {
    redirect("/lender/onboarding", RedirectType.replace);
  }

  if (access.profile.lenderProfile.verification_status === "approved") {
    redirect("/lender?tab=profile", RedirectType.replace);
  }

  return (
    <main className="theme-lendfolio min-h-svh bg-background text-foreground">
      <LenderPageHeader activeTab="profile" />
      <div className="mx-auto max-w-7xl">
        <div className={cn("px-4 pt-4 sm:px-6 sm:pt-6", borrowerPageBottomPadding)}>
          <LenderDetailsCompletionForm
            lenderProfile={access.profile.lenderProfile}
            step={step}
          />
        </div>
        <div className="sm:hidden">
          <LenderBottomTabs activeTab="profile" />
        </div>
      </div>
    </main>
  );
}
