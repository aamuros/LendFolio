import Link from "next/link";
import { ConsentAcceptancePanel } from "@/components/consent-acceptance-panel";
import { LenderApplicationsStatus } from "@/components/lender-applications-list";
import { LenderPendingReviewPanel } from "@/components/lender/lender-pending-review-panel";
import { LenderVerificationDocumentsPanel } from "@/components/lender-verification-documents-panel";
import { BorrowerCard, PageHeader } from "@/components/borrower/ui";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import type { CurrentUserProfile } from "@/lib/access-control";
import type { ConsentStatus } from "@/lib/consents";
import type {
  LenderVerificationDocumentSummary,
  LenderVerificationDocumentPolicy,
} from "@/lib/lender-verification";

export function LenderAccessPanel({
  profile,
  consentStatus,
  documents,
  documentPolicy,
}: {
  profile: CurrentUserProfile;
  consentStatus: ConsentStatus;
  documents: LenderVerificationDocumentSummary[];
  documentPolicy: LenderVerificationDocumentPolicy;
}) {
  const lenderProfile = profile.lenderProfile;
  const isPendingReview =
    profile.role === "lender" &&
    lenderProfile?.verification_status === "pending";
  const isRejected =
    profile.role === "lender" &&
    lenderProfile?.verification_status === "rejected";
  const needsProfile =
    profile.role === "lender" &&
    (!lenderProfile || lenderProfile.verification_status === "incomplete");

  if (isPendingReview) {
    return (
      <LenderPendingReviewPanel
        consentStatus={consentStatus}
        lenderProfile={lenderProfile}
        lenderProfileId={lenderProfile?.id ?? null}
        verificationStatus={lenderProfile?.verification_status ?? "pending"}
        documents={documents}
        documentPolicy={documentPolicy}
        rejectionReason={lenderProfile?.rejection_reason ?? null}
        managerReviewNotes={lenderProfile?.manager_review_notes ?? null}
      />
    );
  }

  if (isRejected) {
    return (
      <div className="grid gap-5">
        <PageHeader
          title="Lender profile"
          description="Update your profile and documents before resubmitting for approval."
        />
        <BorrowerCard>
          <CardContent className="grid gap-4 p-5">
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
          </CardContent>
        </BorrowerCard>
        <ConsentAcceptancePanel scope="lender_review" status={consentStatus} />
        {lenderProfile?.id ? (
          <LenderVerificationDocumentsPanel
            lenderProfileId={lenderProfile.id}
            verificationStatus={lenderProfile.verification_status ?? "rejected"}
            documents={documents}
            documentPolicy={documentPolicy}
            rejectionReason={lenderProfile.rejection_reason ?? null}
            managerReviewNotes={lenderProfile.manager_review_notes ?? null}
          />
        ) : null}
      </div>
    );
  }

  if (needsProfile) {
    return (
      <div className="grid gap-5">
        <PageHeader
          title="Lender dashboard"
          description="Complete your lender profile so a manager can review your account."
        />
        <BorrowerCard>
          <CardContent className="grid gap-4 p-5">
            <LenderApplicationsStatus
              message="Your lender dashboard is ready. Complete your profile to unlock application review and offer tools."
              tone="neutral"
            />
            <Button
              asChild
              className="h-11 w-full rounded-full font-semibold sm:w-fit"
            >
              <Link href="/lender/onboarding">Complete lender profile</Link>
            </Button>
          </CardContent>
        </BorrowerCard>
        <ConsentAcceptancePanel scope="lender_review" status={consentStatus} />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Lender profile"
        description="This account cannot open the lender workspace."
      />
      <BorrowerCard>
        <CardContent className="p-5">
          <LenderApplicationsStatus
            message="Your account does not have access to this workspace."
            tone="error"
          />
        </CardContent>
      </BorrowerCard>
      {profile.role === "lender" ? (
        <ConsentAcceptancePanel scope="lender_review" status={consentStatus} />
      ) : null}
    </div>
  );
}
