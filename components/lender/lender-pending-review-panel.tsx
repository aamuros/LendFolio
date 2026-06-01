import { CheckCircle2, Clock } from "lucide-react";
import { ConsentAcceptancePanel } from "@/components/consent-acceptance-panel";
import { LenderVerificationDocumentsPanel } from "@/components/lender-verification-documents-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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

  return (
    <div className="grid gap-5">
      <Card className="rounded-2xl border-border/50 bg-muted/30 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">
              Your lender profile is under review
            </CardTitle>
          </div>
          <CardDescription className="text-xs leading-5">
            {allConsentsAccepted && allDocumentsAccepted
              ? "A manager will review your profile and lending details. You will be notified once a decision is made."
              : allConsentsAccepted
                ? "Upload the required verification documents so a manager can complete approval."
                : "Accept the remaining disclosures and upload verification documents so a manager can complete approval."}
          </CardDescription>
        </CardHeader>

        <Separator />

        <CardContent className="grid gap-3">
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
        </CardContent>
      </Card>

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
