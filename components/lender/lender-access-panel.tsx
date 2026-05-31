import Link from "next/link";
import { ConsentAcceptancePanel } from "@/components/consent-acceptance-panel";
import { LenderApplicationsStatus } from "@/components/lender-applications-list";
import { LenderPendingReviewPanel } from "@/components/lender/lender-pending-review-panel";
import { Button } from "@/components/ui/button";
import type { CurrentUserProfile } from "@/lib/access-control";
import type { ConsentStatus } from "@/lib/consents";

export function LenderAccessPanel({
  profile,
  consentStatus,
}: {
  profile: CurrentUserProfile;
  consentStatus: ConsentStatus;
}) {
  const isPendingReview =
    profile.role === "lender" &&
    profile.lenderProfile?.verification_status === "pending";
  const isRejected =
    profile.role === "lender" &&
    profile.lenderProfile?.verification_status === "rejected";

  if (isPendingReview) {
    return <LenderPendingReviewPanel consentStatus={consentStatus} />;
  }

  if (isRejected) {
    return (
      <div className="grid gap-5">
        <LenderApplicationsStatus
          message="Your lender access was not approved. Update your lender profile to resubmit."
          tone="error"
        />
        <Button
          asChild
          className="h-11 w-full rounded-full font-semibold sm:w-fit"
        >
          <Link href="/lender/onboarding">Update lender profile</Link>
        </Button>
        <ConsentAcceptancePanel scope="lender_review" status={consentStatus} />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <LenderApplicationsStatus
        message="Your account does not have access to this workspace."
        tone="error"
      />
      {profile.role === "lender" ? (
        <ConsentAcceptancePanel scope="lender_review" status={consentStatus} />
      ) : null}
    </div>
  );
}
