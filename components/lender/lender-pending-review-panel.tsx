"use client";

import { useCallback, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Clock } from "lucide-react";
import { ConsentAcceptancePanel } from "@/components/consent-acceptance-panel";
import { LegalDialog } from "@/components/legal/legal-dialog";
import { lenderVerificationAuthorizationContent } from "@/components/legal/legal-content";
import { LenderVerificationDocumentsPanel } from "@/components/lender-verification-documents-panel";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BorrowerCard, PageHeader, StatusPill } from "@/components/borrower/ui";
import { cn } from "@/lib/utils";
import { getLenderProfileCompletion } from "@/lib/lender-profile-completion";
import type { ConsentStatus } from "@/lib/consents";
import type {
  LenderVerificationDocumentSummary,
  LenderVerificationDocumentPolicy,
} from "@/lib/lender-verification";
import Link from "next/link";

export function LenderPendingReviewPanel({
  consentStatus,
  lenderProfile,
  lenderProfileId,
  verificationStatus,
  documents,
  documentPolicy,
  rejectionReason,
  managerReviewNotes,
}: {
  consentStatus: ConsentStatus;
  lenderProfile: {
    contact_person: string | null;
    phone_number: string | null;
    operating_area: string | null;
    min_loan_amount: number | null;
    max_loan_amount: number | null;
  } | null;
  lenderProfileId: string | null;
  verificationStatus: string;
  documents: LenderVerificationDocumentSummary[];
  documentPolicy: LenderVerificationDocumentPolicy;
  rejectionReason: string | null;
  managerReviewNotes: string | null;
}) {
  const [acceptedInSession, setAcceptedInSession] = useState(false);
  const effectiveConsentStatus = useMemo(() => {
    if (consentStatus.isCurrent || !acceptedInSession) {
      return consentStatus;
    }

    const acceptedAt = new Date().toISOString();
    const accepted = [...consentStatus.accepted];

    for (const required of consentStatus.required) {
      const alreadyAccepted = accepted.some(
        (item) =>
          item.consentType === required.consentType &&
          item.version === required.version,
      );

      if (!alreadyAccepted) {
        accepted.push({
          consentType: required.consentType,
          version: required.version,
          acceptedAt,
        });
      }
    }

    return {
      ...consentStatus,
      isCurrent: true,
      missing: [],
      accepted,
    };
  }, [acceptedInSession, consentStatus]);
  const allConsentsAccepted = effectiveConsentStatus.isCurrent;
  const profileCompletion = getLenderProfileCompletion(lenderProfile);
  const profileDetailsComplete = profileCompletion.complete;
  const allDocumentsAccepted = documentPolicy.documentsAccepted;
  const documentsReadyForReview = documentPolicy.readyForManagerReview;
  const hasSubmittedDocuments =
    documentPolicy.submittedDocumentTypes.length > 0;
  const missingDocumentCount =
    documentPolicy.missingRequiredDocumentTypes.length;
  const needsDocumentUpload = !allDocumentsAccepted;
  const needsProfileDetails = !profileDetailsComplete;
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
            <StatusPill
              tone={
                needsProfileDetails || needsDocumentUpload
                  ? "attention"
                  : "neutral"
              }
            >
              {needsProfileDetails
                ? "Action needed"
                : needsDocumentUpload
                  ? "Documents needed"
                  : "Under review"}
            </StatusPill>
          </div>
          <CardDescription className="text-sm leading-6">
            {needsProfileDetails
              ? "Complete your lender details so a manager can continue review."
              : allConsentsAccepted && allDocumentsAccepted
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
              {profileDetailsComplete ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              ) : (
                <Clock className="size-4 shrink-0 text-amber-600" />
              )}
              <span
                className={cn(
                  "text-sm",
                  profileDetailsComplete
                    ? "text-foreground"
                    : "font-medium text-foreground",
                )}
              >
                Lender details{" "}
                {profileDetailsComplete ? "completed" : "needed"}
              </span>
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
                  : documentsReadyForReview
                    ? "uploaded, awaiting review"
                    : hasSubmittedDocuments
                      ? "partially uploaded"
                      : "upload needed"}
              </span>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              {profileDetailsComplete && allConsentsAccepted && allDocumentsAccepted ? (
                <Clock className="size-4 shrink-0 text-amber-600" />
              ) : (
                <div className="size-4 shrink-0 rounded-full border-2 border-border" />
              )}
              <span
                className={cn(
                  "text-sm",
                  profileDetailsComplete && allConsentsAccepted && allDocumentsAccepted
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                Manager review
                {profileDetailsComplete && allConsentsAccepted && allDocumentsAccepted
                  ? " pending"
                  : ""}
              </span>
            </div>
          </div>
          {needsProfileDetails ? (
            <div className="grid gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm leading-6 text-amber-800 sm:flex sm:items-center sm:justify-between">
              <p>
                Action needed: Complete lender details before manager review.
                Missing: {profileCompletion.missingFields.join(", ")}.
              </p>
              <Button
                asChild
                className="h-10 w-full shrink-0 rounded-full font-semibold sm:w-fit"
              >
                <Link href="/lender/edit-profile/organization">Complete details</Link>
              </Button>
            </div>
          ) : needsDocumentUpload ? (
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
              Profile details complete. Your account is waiting for manager review.
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

      {allConsentsAccepted ? (
        <DisclosureAcceptedConfirmation />
      ) : (
        <ConsentAcceptancePanel
          scope="lender_review"
          status={effectiveConsentStatus}
          title="Required disclosures"
          variant="onboarding"
          onConsentAccepted={() => setAcceptedInSession(true)}
        />
      )}

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

function DisclosureAcceptedConfirmation() {
  return (
    <BorrowerCard>
      <CardContent className="grid gap-2 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <div className="grid gap-1">
            <p className="text-sm font-semibold">
              Required disclosures accepted
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              You have already approved the lender disclosures.
            </p>
            <LegalDialog
              trigger={
                <button
                  type="button"
                  className="w-fit text-xs font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#33423C]"
                >
                  View details
                </button>
              }
              content={lenderVerificationAuthorizationContent}
            />
          </div>
        </div>
      </CardContent>
    </BorrowerCard>
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
