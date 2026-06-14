"use client";

import { useCallback } from "react";
import { CheckCircle2, ClipboardList, Clock } from "lucide-react";
import { ConsentAcceptancePanel } from "@/components/consent-acceptance-panel";
import { LenderVerificationDocumentsPanel } from "@/components/lender-verification-documents-panel";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BorrowerCard, PageHeader, StatusPill } from "@/components/borrower/ui";
import { cn } from "@/lib/utils";
import type { ConsentStatus } from "@/lib/consents";
import type {
  LenderVerificationDocumentSummary,
  LenderVerificationDocumentPolicy,
} from "@/lib/lender-verification";

export function LenderPendingReviewPanel({
  consentStatus,
  lenderProfileId,
  verificationStatus,
  documents,
  documentPolicy,
  rejectionReason,
  managerReviewNotes,
}: {
  consentStatus: ConsentStatus;
  lenderProfileId: string | null;
  verificationStatus: string;
  documents: LenderVerificationDocumentSummary[];
  documentPolicy: LenderVerificationDocumentPolicy;
  rejectionReason: string | null;
  managerReviewNotes: string | null;
}) {
  const allConsentsAccepted = consentStatus.isCurrent;
  const allDocumentsAccepted = documentPolicy.documentsAccepted;
  const hasSubmittedDocuments =
    documentPolicy.submittedDocumentTypes.length > 0;
  const missingDocumentCount =
    documentPolicy.missingRequiredDocumentTypes.length;
  const needsDocumentUpload = !allDocumentsAccepted;
  const uploadNeededCount = documentPolicy.requiredDocumentTypes.filter(
    (documentType) =>
      !documentPolicy.submittedDocumentTypes.includes(documentType) ||
      documentPolicy.rejectedDocumentTypes.includes(documentType),
  ).length;
  const waitingDocumentCount = documentPolicy.requiredDocumentTypes.filter(
    (documentType) =>
      documentPolicy.submittedDocumentTypes.includes(documentType) &&
      !documentPolicy.acceptedDocumentTypes.includes(documentType) &&
      !documentPolicy.rejectedDocumentTypes.includes(documentType),
  ).length;

  const handleViewDocuments = useCallback(() => {
    const section = document.getElementById("lender-verification-documents");

    section?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    window.setTimeout(() => {
      const firstActionableRow =
        section?.querySelector<HTMLElement>(
          '[data-lender-document-state="missing"], [data-lender-document-state="rejected"]',
        ) ??
        section?.querySelector<HTMLElement>(
          '[data-lender-document-state="submitted"]',
        );

      firstActionableRow?.focus({ preventScroll: true });
    }, 350);
  }, []);

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Lender profile"
        description="Complete the remaining approval steps to activate lender access."
      />

      <BorrowerCard variant="dashboard">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <CardTitle className="text-base font-semibold">
                Profile under review
              </CardTitle>
            </div>
            <StatusPill tone={needsDocumentUpload ? "attention" : "neutral"}>
              {needsDocumentUpload ? "Documents needed" : "Under review"}
            </StatusPill>
          </div>
          <CardDescription className="text-sm leading-6">
            {allConsentsAccepted && allDocumentsAccepted
              ? "A manager will review your profile and lending details. You will be notified once a decision is made."
              : allConsentsAccepted
                ? "Upload the required verification documents so a manager can complete approval."
                : "Accept the remaining disclosures and upload verification documents so a manager can complete approval."}
          </CardDescription>
        </CardHeader>

        <Separator />

        <CardContent className="grid gap-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Approval progress
          </p>
          <div className="grid gap-2.5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              <span className="text-sm">Lender profile submitted</span>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              {allConsentsAccepted ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              ) : (
                <Clock className="size-4 shrink-0 text-amber-600" />
              )}
              <span
                className={cn(
                  "text-sm",
                  allConsentsAccepted
                    ? "text-foreground"
                    : "font-medium text-foreground",
                )}
              >
                Required disclosures{" "}
                {allConsentsAccepted ? "accepted" : "acceptance needed"}
              </span>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              {allDocumentsAccepted ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              ) : (
                <Clock className="size-4 shrink-0 text-amber-600" />
              )}
              <span
                className={cn(
                  "text-sm",
                  allDocumentsAccepted
                    ? "text-foreground"
                    : "font-medium text-foreground",
                )}
              >
                Verification documents{" "}
                {allDocumentsAccepted
                  ? "accepted"
                  : hasSubmittedDocuments
                    ? "uploaded, awaiting review"
                    : "upload needed"}
              </span>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <div className="size-4 shrink-0 rounded-full border-2 border-border" />
              <span className="text-sm text-muted-foreground">
                Manager review
              </span>
            </div>
          </div>
          {needsDocumentUpload ? (
            <Button
              type="button"
              className="h-11 w-full rounded-full font-semibold sm:w-fit"
              onClick={handleViewDocuments}
            >
              <ClipboardList className="size-4" />
              Complete document requirements
            </Button>
          ) : (
            <p className="rounded-xl border border-[#C9D7C6] bg-[#EFF3EA] px-3 py-2 text-sm leading-6 text-[#33423C]">
              No action needed right now.
            </p>
          )}
          {needsDocumentUpload ? (
            <p className="text-xs leading-5 text-muted-foreground">
              {getDocumentProgressMessage({
                missingDocumentCount,
                uploadNeededCount,
                waitingDocumentCount,
              })}
            </p>
          ) : null}
        </CardContent>
      </BorrowerCard>

      {!allConsentsAccepted ? (
        <ConsentAcceptancePanel
          scope="lender_review"
          status={consentStatus}
          title="Required disclosures"
          variant="onboarding"
        />
      ) : null}

      {lenderProfileId ? (
        <LenderVerificationDocumentsPanel
          lenderProfileId={lenderProfileId}
          verificationStatus={verificationStatus}
          documents={documents}
          documentPolicy={documentPolicy}
          rejectionReason={rejectionReason}
          managerReviewNotes={managerReviewNotes}
        />
      ) : null}
    </div>
  );
}

function getDocumentProgressMessage({
  missingDocumentCount,
  uploadNeededCount,
  waitingDocumentCount,
}: {
  missingDocumentCount: number;
  uploadNeededCount: number;
  waitingDocumentCount: number;
}) {
  if (uploadNeededCount > 0) {
    return `${uploadNeededCount} required document${
      uploadNeededCount === 1 ? "" : "s"
    } still need your upload.`;
  }

  if (waitingDocumentCount > 0) {
    return `${waitingDocumentCount} uploaded document${
      waitingDocumentCount === 1 ? " is" : "s are"
    } waiting for manager acceptance.`;
  }

  return `${missingDocumentCount} document${
    missingDocumentCount === 1 ? "" : "s"
  } still need to be uploaded or accepted by a manager.`;
}
