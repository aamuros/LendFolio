"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  lenderVerificationDocumentAllowedTypes,
  lenderVerificationDocumentMaxFileSize,
  lenderVerificationDocumentTypeDescriptions,
  lenderVerificationDocumentTypeLabels,
  requiredLenderVerificationDocumentTypes,
  type LenderVerificationDocumentSummary,
  type LenderVerificationDocumentPolicy,
  type LenderVerificationDocumentType,
} from "@/lib/lender-verification";
import { DocumentAiReviewNote } from "@/components/document-ai-review-note";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { DocumentPreviewDialog } from "@/components/document-preview-dialog";
import {
  UploadIcon,
  Clock,
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

type UploadState =
  | {
      ok: true;
      message: string;
      aiReviewStatus?: "fail" | "needs_manual_review" | "error";
    }
  | {
      ok: false;
      message: string;
    };

type LenderDocumentBadgeTone = "success" | "danger" | "attention" | "neutral";

const lenderDocumentAccept = "application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png";

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
    <div id="lender-verification-documents" className="scroll-mt-24 grid gap-5">
      <HeaderCard
        facingState={facingState}
        rejectionReason={rejectionReason}
        managerReviewNotes={managerReviewNotes}
        missingCount={documentPolicy.missingRequiredDocumentTypes.length}
      />

      <RequiredDocumentsSection
        lenderProfileId={lenderProfileId}
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
  const toneMap: Record<typeof facingState, LenderDocumentBadgeTone> = {
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
    <Card size="sm">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold">
            Verification documents
          </CardTitle>
          <LenderDocumentStatusBadge tone={toneMap[facingState]}>
            {labelMap[facingState]}
          </LenderDocumentStatusBadge>
        </div>
        <CardDescription>{descMap[facingState]}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {isWaiting ? (
          <Alert>
            <Clock className="size-4" />
            <AlertDescription>No action needed right now.</AlertDescription>
          </Alert>
        ) : null}
        {rejectionReason ? (
          <Alert variant="destructive">
            <AlertTitle>Manager feedback</AlertTitle>
            <AlertDescription>{rejectionReason}</AlertDescription>
          </Alert>
        ) : null}
        {managerReviewNotes ? (
          <Alert>
            <AlertTitle>Manager note</AlertTitle>
            <AlertDescription>{managerReviewNotes}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RequiredDocumentsSection({
  lenderProfileId,
  documents,
  documentPolicy,
  canUpload,
}: {
  lenderProfileId: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localPreviewOpen, setLocalPreviewOpen] = useState(false);
  const [state, setState] = useState<UploadState | null>(null);
  const [isPending, setIsPending] = useState(false);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!state?.ok) {
      return;
    }

    formRef.current?.reset();
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    window.setTimeout(() => {
      setSelectedFile(null);
      setPreviewUrl(null);
      setLocalPreviewOpen(false);
    }, 0);
    router.refresh();
  }, [router, state]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    setSelectedFile(file);
    setState(null);

    const url = file ? URL.createObjectURL(file) : null;
    previewUrlRef.current = url;
    setPreviewUrl(url);
  }

  const docStatus = getDocumentDisplayStatus(documentPolicy, documentType);
  const latestDoc = documents.find(
    (doc) => doc.documentType === documentType && doc.status !== "superseded",
  ) ?? null;
  const showUpload =
    canUpload && docStatus.state !== "accepted";
  const uploadButtonLabel =
    docStatus.state === "rejected" || latestDoc ? "Replace file" : "Upload file";
  const selectedFileError = selectedFile ? validateDocumentFile(selectedFile) : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const file = selectedFile ?? fileInputRef.current?.files?.[0] ?? null;

    if (!file) {
      setState({
        ok: false,
        message: "Choose a verification document to upload.",
      });
      return;
    }

    const validationError = validateDocumentFile(file);
    if (validationError) {
      setState({ ok: false, message: validationError });
      return;
    }

    const formData = new FormData(event.currentTarget);
    setIsPending(true);
    setState(null);

    try {
      const response = await fetch("/api/lender/verification-documents", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as UploadState;

      setState({
        ok: result.ok,
        message:
          result.message ??
          (response.ok
            ? "Verification document uploaded."
            : "Could not upload verification document."),
      });
    } catch {
      setState({
        ok: false,
        message: "Could not upload verification document.",
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div
      tabIndex={-1}
      data-lender-document-state={docStatus.state}
      className="focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
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
          <LenderDocumentStatusBadge tone={docStatus.tone}>
            {docStatus.label}
          </LenderDocumentStatusBadge>
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
          <Alert>
            <AlertTitle>Manager feedback</AlertTitle>
            <AlertDescription>{latestDoc.reviewNotes}</AlertDescription>
          </Alert>
        ) : null}

        {latestDoc ? <DocumentAiReviewNote review={latestDoc.aiReview} /> : null}

        {showUpload ? (
          <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
            <input type="hidden" name="documentType" value={documentType} />
            <input type="hidden" name="lenderProfileId" value={lenderProfileId} />
            <input
              ref={fileInputRef}
              id={fileInputId}
              name="documentFile"
              type="file"
              accept={lenderDocumentAccept}
              className="sr-only"
              onChange={handleFileChange}
              required
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                asChild
                variant="outline"
                className="h-8 rounded-full px-3.5 text-xs font-semibold"
              >
                <label htmlFor={fileInputId}>
                  <UploadIcon className="size-3" />
                  {uploadButtonLabel}
                </label>
              </Button>
              <Button
                type="submit"
                disabled={isPending || !selectedFile || Boolean(selectedFileError)}
                className="w-fit rounded-full h-8 px-3.5 text-xs font-semibold"
              >
                {isPending
                  ? "Uploading..."
                  : docStatus.state === "rejected"
                    ? "Submit replacement"
                    : latestDoc
                      ? "Submit replacement"
                      : "Submit document"}
              </Button>
              <p className="text-xs text-muted-foreground">
                {selectedFile
                  ? `${selectedFile.name} (${formatFileSize(selectedFile.size)})`
                  : "PDF, JPG, JPEG, or PNG. Max 5 MB."}
              </p>
              {selectedFile && previewUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setLocalPreviewOpen(true)}
                >
                  <Eye className="size-3.5" />
                  Preview
                </Button>
              ) : null}
            </div>
            {selectedFileError ? (
              <Alert variant="destructive">
                <AlertDescription>{selectedFileError}</AlertDescription>
              </Alert>
            ) : null}
          </form>
        ) : null}

        {state ? (
          <Alert variant={state.ok ? "default" : "destructive"} role="status">
            <AlertTitle>
              {state.ok ? "Document submitted" : "Upload failed"}
            </AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      {selectedFile && previewUrl ? (
        <DocumentPreviewDialog
          title={`${lenderVerificationDocumentTypeLabels[documentType]} Preview`}
          fileName={selectedFile.name}
          fileSize={selectedFile.size}
          fileType={selectedFile.type}
          viewUrl={previewUrl}
          open={localPreviewOpen}
          onOpenChange={setLocalPreviewOpen}
        />
      ) : null}
    </div>
  );
}

function getDocumentDisplayStatus(
  policy: LenderVerificationDocumentPolicy,
  documentType: LenderVerificationDocumentType,
): {
  state: "missing" | "submitted" | "accepted" | "rejected";
  label: string;
  tone: LenderDocumentBadgeTone;
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

function LenderDocumentStatusBadge({
  tone,
  children,
}: {
  tone: LenderDocumentBadgeTone;
  children: ReactNode;
}) {
  return (
    <Badge
      variant={
        tone === "danger"
          ? "destructive"
          : tone === "neutral"
            ? "secondary"
            : "outline"
      }
      className={getBadgeClassName(tone)}
    >
      {children}
    </Badge>
  );
}

function getBadgeClassName(tone: LenderDocumentBadgeTone) {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (tone === "attention") {
    return "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50";
  }

  return undefined;
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function validateDocumentFile(file: File) {
  if (!lenderVerificationDocumentAllowedTypes.has(file.type)) {
    return "Upload a PDF, JPG, JPEG, or PNG file.";
  }

  if (file.size > lenderVerificationDocumentMaxFileSize) {
    return "This file is too large. Please upload a file under 5 MB.";
  }

  return null;
}
