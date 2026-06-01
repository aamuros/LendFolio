import Link from "next/link";
import { ConsentAcceptancePanel } from "@/components/consent-acceptance-panel";
import { LenderApplicationsStatus } from "@/components/lender-applications-list";
import { LenderPendingReviewPanel } from "@/components/lender/lender-pending-review-panel";
import { LenderVerificationDocumentsPanel } from "@/components/lender-verification-documents-panel";
import { Button } from "@/components/ui/button";
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

  if (isPendingReview) {
    return (
      <LenderPendingReviewPanel
        consentStatus={consentStatus}
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
