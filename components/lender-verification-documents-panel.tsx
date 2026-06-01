"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  submitLenderVerificationDocument,
  type LenderVerificationDocumentSubmitResult,
} from "@/app/lender/actions";
import {
  lenderVerificationDocumentTypeDescriptions,
  lenderVerificationDocumentTypeLabels,
  requiredLenderVerificationDocumentTypes,
  type LenderVerificationDocumentSummary,
  type LenderVerificationDocumentPolicy,
  type LenderVerificationDocumentType,
} from "@/lib/lender-verification";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ToneBadge, type BadgeTone } from "@/components/borrower-status-badge";
import { DocumentPreviewDialog } from "@/components/document-preview-dialog";
import {
  UploadIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Eye,
} from "lucide-react";

type LenderVerificationDocumentsPanelProps = {
  lenderProfileId: string;
  verificationStatus: string;
  documents: LenderVerificationDocumentSummary[];
  documentPolicy: LenderVerificationDocumentPolicy;
  rejectionReason: string | null;
  managerReviewNotes: string | null;
};

const initialState: LenderVerificationDocumentSubmitResult | null = null;

export function LenderVerificationDocumentsPanel({
  lenderProfileId,
  verificationStatus,
  documents,
  documentPolicy,
  rejectionReason,
  managerReviewNotes,
}: LenderVerificationDocumentsPanelProps) {
  const canUpload = [
    "incomplete",
    "pending",
    "rejected",
  ].includes(verificationStatus);

  const allAccepted = documentPolicy.documentsAccepted;
  const hasSubmitted = documentPolicy.submittedDocumentTypes.length > 0;

  let facingState: "missing_documents" | "waiting_review" | "needs_update" | "approved" = "missing_documents";
  if (verificationStatus === "approved" && allAccepted) {
    facingState = "approved";
  } else if (verificationStatus === "rejected") {
    facingState = "needs_update";
  } else if (allAccepted || (hasSubmitted && documentPolicy.readyForManagerReview)) {
    facingState = "waiting_review";
  }

  return (
    <div className="grid gap-5">
      <HeaderCard
        facingState={facingState}
        rejectionReason={rejectionReason}
        managerReviewNotes={managerReviewNotes}
        missingCount={documentPolicy.missingRequiredDocumentTypes.length}
      />

      <RequiredDocumentsSection
        lenderProfileId={lenderProfileId}
        verificationStatus={verificationStatus}
        documents={documents}
        documentPolicy={documentPolicy}
        canUpload={canUpload}
      />
    </div>
  );
}

function HeaderCard({
  facingState,
  rejectionReason,
  managerReviewNotes,
  missingCount,
}: {
  facingState: "missing_documents" | "waiting_review" | "needs_update" | "approved";
  rejectionReason: string | null;
  managerReviewNotes: string | null;
  missingCount: number;
}) {
  const toneMap: Record<typeof facingState, BadgeTone> = {
    approved: "success",
    needs_update: "danger",
    waiting_review: "neutral",
    missing_documents: "attention",
  };
  const labelMap: Record<typeof facingState, string> = {
    approved: "Approved",
    needs_update: "Needs update",
    waiting_review: "Waiting for review",
    missing_documents: "Documents needed",
  };
  const descMap: Record<typeof facingState, string> = {
    approved: "Your lender verification documents are approved.",
    needs_update: "One or more documents need to be replaced.",
    waiting_review: "Your required documents are uploaded and waiting for manager review.",
    missing_documents: `Upload ${missingCount} required document${missingCount !== 1 ? "s" : ""} to proceed.`,
  };

  const isWaiting = facingState === "waiting_review";

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Verification documents</h2>
        <ToneBadge tone={toneMap[facingState]}>
          {labelMap[facingState]}
        </ToneBadge>
      </div>
      <p className="text-sm text-muted-foreground">
        {descMap[facingState]}
      </p>
      {isWaiting ? (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50/70 px-3.5 py-2.5 text-xs text-amber-700">
          <Clock className="size-3.5 shrink-0" />
          No action needed right now.
        </div>
      ) : null}
      {rejectionReason ? (
        <Alert variant="destructive">
          <AlertDescription>{rejectionReason}</AlertDescription>
        </Alert>
      ) : null}
      {managerReviewNotes ? (
        <Alert>
          <AlertDescription>{managerReviewNotes}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

function RequiredDocumentsSection({
  lenderProfileId,
  verificationStatus,
  documents,
  documentPolicy,
  canUpload,
}: {
  lenderProfileId: string;
  verificationStatus: string;
  documents: LenderVerificationDocumentSummary[];
  documentPolicy: LenderVerificationDocumentPolicy;
  canUpload: boolean;
}) {
  const [previewDoc, setPreviewDoc] = useState<{
    documentType: LenderVerificationDocumentType;
    doc: LenderVerificationDocumentSummary;
  } | null>(null);

  return (
    <>
      <Card className="gap-2">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Required documents</CardTitle>
          <CardDescription className="text-xs">
            Upload all five required documents to proceed with verification.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {requiredLenderVerificationDocumentTypes.map((docType, index) => (
            <div key={docType}>
              {index > 0 ? <Separator /> : null}
              <RequiredDocumentRow
                documentType={docType}
                lenderProfileId={lenderProfileId}
                documents={documents}
                documentPolicy={documentPolicy}
                canUpload={canUpload}
                onPreview={(doc) => setPreviewDoc({ documentType: docType, doc })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {previewDoc ? (
        <DocumentPreviewDialog
          title={`${lenderVerificationDocumentTypeLabels[previewDoc.documentType]} Preview`}
          fileName={previewDoc.doc.fileName}
          fileSize={previewDoc.doc.fileSize}
          fileType={previewDoc.doc.fileType}
          viewUrl={previewDoc.doc.viewUrl}
          open
          onOpenChange={(open) => {
            if (!open) setPreviewDoc(null);
          }}
        />
      ) : null}
    </>
  );
}

function RequiredDocumentRow({
  documentType,
  lenderProfileId,
  documents,
  documentPolicy,
  canUpload,
  onPreview,
}: {
  documentType: LenderVerificationDocumentType;
  lenderProfileId: string;
  documents: LenderVerificationDocumentSummary[];
  documentPolicy: LenderVerificationDocumentPolicy;
  canUpload: boolean;
  onPreview: (doc: LenderVerificationDocumentSummary) => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    submitLenderVerificationDocument,
    initialState,
  );

  useEffect(() => {
    if (!state?.ok) {
      return;
    }

    formRef.current?.reset();
    router.refresh();
  }, [router, state]);

  const docStatus = getDocumentDisplayStatus(documentPolicy, documentType);
  const latestDoc = documents.find(
    (doc) => doc.documentType === documentType && doc.status !== "superseded",
  ) ?? null;
  const showUpload =
    canUpload && docStatus.state !== "accepted";

  return (
    <div>
      <div className="grid gap-4 px-5 py-4 sm:py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {lenderVerificationDocumentTypeLabels[documentType]}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {lenderVerificationDocumentTypeDescriptions[documentType]}
            </p>
          </div>
          <ToneBadge tone={docStatus.tone}>{docStatus.label}</ToneBadge>
        </div>

        {latestDoc ? (
          <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2">
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <button
                type="button"
                className="text-sm font-medium truncate text-left hover:underline w-full"
                onClick={() => onPreview(latestDoc)}
              >
                {latestDoc.fileName}
              </button>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(latestDoc.fileSize)}
              </p>
            </div>
            {latestDoc.viewUrl ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onPreview(latestDoc)}
              >
                <Eye className="size-3.5" />
                Preview
              </Button>
            ) : null}
          </div>
        ) : null}

        {latestDoc?.reviewNotes ? (
          <p className="text-xs text-muted-foreground">
            {latestDoc.reviewNotes}
          </p>
        ) : null}

        {showUpload ? (
          <form ref={formRef} action={formAction} className="grid gap-3">
            <input type="hidden" name="documentType" value={documentType} />
            <input type="hidden" name="lenderProfileId" value={lenderProfileId} />
            <input
              name="documentFile"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-secondary-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              required
            />
            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={isPending}
                className="w-fit rounded-full h-8 px-3.5 text-xs font-semibold"
              >
                <UploadIcon className="size-3" />
                {isPending
                  ? "Uploading..."
                  : docStatus.state === "rejected"
                    ? "Replace"
                    : latestDoc
                      ? "Replace"
                      : "Upload"}
              </Button>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, WebP, or PDF. Max 5 MB.
              </p>
            </div>
          </form>
        ) : null}

        {state ? (
          <p
            className={`rounded-md border px-3 py-1.5 text-xs leading-5 ${
              state.ok
                ? "border-border bg-muted/30 text-muted-foreground"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
            role="status"
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function getDocumentDisplayStatus(
  policy: LenderVerificationDocumentPolicy,
  documentType: LenderVerificationDocumentType,
): {
  state: "missing" | "submitted" | "accepted" | "rejected";
  label: string;
  tone: BadgeTone;
} {
  if (policy.acceptedDocumentTypes.includes(documentType)) {
    return { state: "accepted", label: "Accepted", tone: "success" };
  }

  if (policy.rejectedDocumentTypes.includes(documentType)) {
    return { state: "rejected", label: "Needs replacement", tone: "danger" };
  }

  if (policy.submittedDocumentTypes.includes(documentType)) {
    return {
      state: "submitted",
      label: "Uploaded, waiting for review",
      tone: "neutral",
    };
  }

  return { state: "missing", label: "Upload required", tone: "attention" };
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}
