"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  submitBorrowerVerificationDocument,
  type BorrowerVerificationDocumentSubmitResult,
} from "@/app/borrower/actions";
import { acceptUserConsentsAction } from "@/app/consents/actions";
import { borrowerVerificationUpdatedEvent } from "@/lib/borrower-workflow-events";
import {
  borrowerFacingVerificationStateDescriptions,
  borrowerFacingVerificationStateLabels,
  borrowerVerificationDocumentAllowedTypes,
  borrowerVerificationDocumentMaxFileSize,
  borrowerVerificationDocumentTypeDescriptions,
  borrowerVerificationDocumentTypeLabels,
  getBorrowerFacingVerificationState,
  requiredBorrowerVerificationDocumentTypes,
  type BorrowerFacingVerificationState,
  type BorrowerVerificationDocumentType,
  type BorrowerVerificationSummary,
} from "@/lib/borrower-verification";
import type { BorrowerReadinessStatus } from "@/lib/borrower-readiness";
import type { ConsentStatus } from "@/lib/consents";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ToneBadge, type BadgeTone } from "@/components/borrower-status-badge";
import { DocumentPreviewDialog } from "@/components/document-preview-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  UploadIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Eye,
} from "lucide-react";

type BorrowerVerificationDocumentsPanelProps = {
  verification: BorrowerVerificationSummary | null;
  consentStatus: ConsentStatus | null;
  readinessStatus?: BorrowerReadinessStatus | null;
  onClose?: () => void;
};

const initialState: BorrowerVerificationDocumentSubmitResult | null = null;

export function BorrowerVerificationDocumentsPanel({
  verification,
  consentStatus,
  readinessStatus,
  onClose,
}: BorrowerVerificationDocumentsPanelProps) {
  const router = useRouter();
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentMessage, setConsentMessage] = useState("");
  const [consentDialogOpen, setConsentDialogOpen] = useState(
    consentStatus ? !consentStatus.isCurrent : false,
  );
  const [acceptedDisclosuresInSession, setAcceptedDisclosuresInSession] =
    useState(false);
  const [isConsentPending, startConsentTransition] = useTransition();
  const effectiveConsentStatus = useMemo(() => {
    if (
      !consentStatus ||
      consentStatus.isCurrent ||
      !acceptedDisclosuresInSession
    ) {
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
  }, [acceptedDisclosuresInSession, consentStatus]);

  if (!verification || verification.status === "missing") {
    return null;
  }

  const disclosuresCurrent = effectiveConsentStatus?.isCurrent ?? false;
  const facingState = getBorrowerFacingVerificationState(
    verification,
    disclosuresCurrent,
  );
  const canUpload = [
    "not_started",
    "pending",
    "pending_documents",
    "rejected",
    "needs_resubmission",
  ].includes(verification.status);

  function handleDialogOpenChange(open: boolean) {
    setConsentDialogOpen(open);
    if (!open && !disclosuresCurrent) {
      onClose?.();
    }
  }

  function acceptDisclosures() {
    if (!consentStatus) {
      return;
    }

    setConsentMessage("");
    startConsentTransition(async () => {
      const result = await acceptUserConsentsAction(consentStatus.scope);

      setConsentMessage(result.message);

      if (result.ok) {
        setAcceptedDisclosuresInSession(true);
        setConsentChecked(false);
        setConsentDialogOpen(false);
        window.dispatchEvent(new Event(borrowerVerificationUpdatedEvent));
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-5">
      <HeaderCard
        facingState={facingState}
        verification={verification}
      />

      <DisclosuresSection
        consentStatus={effectiveConsentStatus}
        consentChecked={consentChecked}
        consentMessage={consentMessage}
        isConsentPending={isConsentPending}
        onConsentCheckedChange={setConsentChecked}
        onAccept={acceptDisclosures}
        dialogOpen={consentDialogOpen}
        onDialogOpenChange={handleDialogOpenChange}
      />

      <RequiredDocumentsSection
        verification={verification}
        canUpload={canUpload}
        disclosuresCurrent={disclosuresCurrent}
      />

      <ApplicationReadinessBanner facingState={facingState} readinessStatus={readinessStatus} />
    </div>
  );
}

function HeaderCard({
  facingState,
  verification,
}: {
  facingState: BorrowerFacingVerificationState;
  verification: BorrowerVerificationSummary;
}) {
  const tone = getFacingStateTone(facingState);
  const isWaiting = facingState === "waiting_review" || facingState === "under_review";
  const needsUpdate = facingState === "needs_update";

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Borrower verification</h2>
        <ToneBadge tone={tone}>
          {borrowerFacingVerificationStateLabels[facingState]}
        </ToneBadge>
      </div>
      <p className="text-sm text-muted-foreground">
        {borrowerFacingVerificationStateDescriptions[facingState]}
      </p>
      {needsUpdate ? (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertTitle>Verification update required</AlertTitle>
          <AlertDescription>
            Some profile details changed after approval. Please replace your
            verification documents so we can review the updated information.
          </AlertDescription>
        </Alert>
      ) : null}
      {isWaiting ? (
        <div className="flex items-center gap-2 rounded-lg border border-[#E2DAC6] bg-[#F8F1DD] px-3.5 py-2.5 text-xs text-[#6A4B17]">
          <Clock className="size-3.5 shrink-0" />
          We will ask for a replacement if a document is not accepted.
        </div>
      ) : null}
      {verification.rejectionReason && !needsUpdate ? (
        <Alert variant="destructive">
          <AlertDescription>
            {verification.rejectionReason}
          </AlertDescription>
        </Alert>
      ) : null}
      {verification.managerReviewNotes && !needsUpdate ? (
        <Alert>
          <AlertDescription>
            {verification.managerReviewNotes}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

function DisclosuresSection({
  consentStatus,
  consentChecked,
  consentMessage,
  isConsentPending,
  onConsentCheckedChange,
  onAccept,
  dialogOpen,
  onDialogOpenChange,
}: {
  consentStatus: ConsentStatus | null;
  consentChecked: boolean;
  consentMessage: string;
  isConsentPending: boolean;
  onConsentCheckedChange: (checked: boolean) => void;
  onAccept: () => void;
  dialogOpen: boolean;
  onDialogOpenChange: (open: boolean) => void;
}) {
  if (!consentStatus) {
    return null;
  }

  if (consentStatus.isCurrent) {
    return null;
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={onDialogOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Document Processing Consent</DialogTitle>
          <DialogDescription>
            To complete borrower verification, you will upload a valid
            government-issued ID and proof of business registration. By
            accepting, you allow LendFolio to review and process these documents
            solely for identity and business verification. Your documents are
            stored securely and handled in accordance with our Privacy Notice.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-3">
          <Checkbox
            id="verification-consent-dialog"
            checked={consentChecked}
            onCheckedChange={(checked) =>
              onConsentCheckedChange(checked === true)
            }
            className="mt-0.5"
          />
          <Label
            htmlFor="verification-consent-dialog"
            className="text-sm font-semibold leading-snug cursor-pointer"
          >
            I consent to the processing of my verification documents.
          </Label>
        </div>
        {consentMessage ? (
          <p
            className="text-sm leading-6 text-muted-foreground"
            role="status"
          >
            {consentMessage}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            disabled={!consentChecked || isConsentPending}
            onClick={onAccept}
            className="rounded-full font-semibold"
          >
            {isConsentPending ? "Accepting..." : "Accept & continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RequiredDocumentsSection({
  verification,
  canUpload,
  disclosuresCurrent,
}: {
  verification: BorrowerVerificationSummary;
  canUpload: boolean;
  disclosuresCurrent: boolean;
}) {
  const [previewDoc, setPreviewDoc] = useState<{
    documentType: BorrowerVerificationDocumentType;
    doc: NonNullable<ReturnType<typeof getLatestDocumentForType>>;
  } | null>(null);
  const replacementRequired = verification.status === "needs_resubmission";

  return (
    <>
      <Card className="gap-2">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Required documents</CardTitle>
          <CardDescription className="text-xs">
            {replacementRequired
              ? "Replace both required documents to resubmit verification."
              : "Upload both required documents to proceed with verification."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {requiredBorrowerVerificationDocumentTypes.map((docType, index) => (
            <div key={docType}>
              {index > 0 ? <Separator /> : null}
              <RequiredDocumentRow
                documentType={docType}
                verification={verification}
                canUpload={canUpload && disclosuresCurrent}
                onPreview={(doc) => setPreviewDoc({ documentType: docType, doc })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {previewDoc ? (
        <DocumentPreviewDialog
          title={`${borrowerVerificationDocumentTypeLabels[previewDoc.documentType]} Preview`}
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
  verification,
  canUpload,
  onPreview,
}: {
  documentType: BorrowerVerificationDocumentType;
  verification: BorrowerVerificationSummary;
  canUpload: boolean;
  onPreview: (doc: NonNullable<ReturnType<typeof getLatestDocumentForType>>) => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    submitBorrowerVerificationDocument,
    initialState,
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileValidationError, setFileValidationError] = useState("");
  const [localPreviewOpen, setLocalPreviewOpen] = useState(false);
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
    window.dispatchEvent(new Event(borrowerVerificationUpdatedEvent));
    router.refresh();
  }, [router, state]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) {
      return;
    }

    function handleFormReset() {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setSelectedFile(null);
      setPreviewUrl(null);
      setFileValidationError("");
    }

    form.addEventListener("reset", handleFormReset);
    return () => form.removeEventListener("reset", handleFormReset);
  }, []);

  function clearSelectedFile(input: HTMLInputElement) {
    input.value = "";
    setSelectedFile(null);
    setPreviewUrl(null);
    setLocalPreviewOpen(false);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    setFileValidationError("");

    if (!file) {
      clearSelectedFile(event.currentTarget);
      return;
    }

    if (!borrowerVerificationDocumentAllowedTypes.has(file.type)) {
      clearSelectedFile(event.currentTarget);
      setFileValidationError("Upload a JPG, PNG, WebP, or PDF file.");
      return;
    }

    if (file.size > borrowerVerificationDocumentMaxFileSize) {
      clearSelectedFile(event.currentTarget);
      setFileValidationError(
        `This file is ${formatFileSize(file.size)}. Upload a file up to 5 MB.`,
      );
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setPreviewUrl(url);
  }

  const docStatus = getRequiredDocumentDisplayStatus(
    verification,
    documentType,
  );
  const replacementRequired = verification.status === "needs_resubmission";
  const latestDoc = replacementRequired
    ? getLatestReplacementCandidateForType(verification, documentType)
    : getLatestDocumentForType(verification, documentType);
  const showUpload = canUpload && docStatus.state !== "accepted";
  const previousFileLabel =
    replacementRequired && latestDoc?.status !== "submitted"
      ? "Previously accepted file"
      : "Uploaded file";

  return (
    <div>
      <div className="grid gap-4 px-5 py-4 sm:py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {borrowerVerificationDocumentTypeLabels[documentType]}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {borrowerVerificationDocumentTypeDescriptions[documentType]}
            </p>
          </div>
          <ToneBadge tone={docStatus.tone}>{docStatus.label}</ToneBadge>
        </div>

        {latestDoc ? (
          <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2">
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
                {previousFileLabel}
              </p>
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
            <input
              name="documentFile"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-secondary-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              required
              onChange={handleFileChange}
            />
            {selectedFile ? (
              <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                {previewUrl ? (
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
            ) : null}
            {fileValidationError ? (
              <p className="text-xs text-destructive" role="alert">
                {fileValidationError}
              </p>
            ) : null}
            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={isPending || Boolean(fileValidationError)}
                className="w-fit rounded-full h-8 px-3.5 text-xs font-semibold"
              >
                <UploadIcon className="size-3" />
                {isPending
                  ? "Uploading..."
                  : replacementRequired
                    ? `Replace ${borrowerVerificationDocumentTypeLabels[documentType]}`
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
              state.ok && state.aiReviewStatus
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : state.ok
                  ? "border-border bg-muted/30 text-muted-foreground"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
            role="status"
          >
            {state.message}
          </p>
        ) : null}
      </div>

      {selectedFile && previewUrl ? (
        <DocumentPreviewDialog
          title={`${borrowerVerificationDocumentTypeLabels[documentType]} Preview`}
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

function ApplicationReadinessBanner({
  facingState,
  readinessStatus,
}: {
  facingState: BorrowerFacingVerificationState;
  readinessStatus?: BorrowerReadinessStatus | null;
}) {
  const verificationApproved = facingState === "approved";
  const profileBlocksApply =
    readinessStatus === "needs_review" ||
    readinessStatus === "not_eligible" ||
    readinessStatus === "incomplete";

  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm ${
        verificationApproved && !profileBlocksApply
          ? "border border-[#C9D7C6] bg-[#EFF3EA] text-[#33423C]"
          : "border border-border/80 bg-muted/70 text-muted-foreground"
      }`}
    >
      {verificationApproved && !profileBlocksApply ? (
        <CheckCircle2 className="size-4 shrink-0" />
      ) : (
        <AlertCircle className="size-4 shrink-0" />
      )}
      {verificationApproved
        ? profileBlocksApply
          ? "Verification approved. Update your borrower profile before applying."
          : "Verification approved. You can now apply for financing."
        : "Loan applications unlock after verification approval."}
    </div>
  );
}

function getFacingStateTone(
  state: BorrowerFacingVerificationState,
): BadgeTone {
  switch (state) {
    case "approved":
      return "success";
    case "needs_update":
      return "danger";
    case "waiting_review":
    case "under_review":
      return "neutral";
    case "missing_disclosures":
    case "missing_documents":
      return "attention";
  }
}

function getRequiredDocumentDisplayStatus(
  verification: BorrowerVerificationSummary,
  documentType: BorrowerVerificationDocumentType,
): {
  state: "missing" | "submitted" | "accepted" | "rejected";
  label: string;
  tone: BadgeTone;
} {
  const policy = verification.documentPolicy;

  if (verification.status === "needs_resubmission") {
    if (policy.submittedDocumentTypes.includes(documentType)) {
      return {
        state: "submitted",
        label: "Replacement uploaded",
        tone: "neutral",
      };
    }

    return {
      state: "rejected",
      label: "Replacement required",
      tone: "danger",
    };
  }

  if (policy.acceptedDocumentTypes.includes(documentType)) {
    return { state: "accepted", label: "Accepted", tone: "success" };
  }

  if (policy.rejectedDocumentTypes.includes(documentType)) {
    return { state: "rejected", label: "Needs replacement", tone: "danger" };
  }

  if (policy.submittedDocumentTypes.includes(documentType)) {
    return {
      state: "submitted",
      label: "Checking upload",
      tone: "neutral",
    };
  }

  return { state: "missing", label: "Upload required", tone: "attention" };
}

function getLatestDocumentForType(
  verification: BorrowerVerificationSummary,
  documentType: BorrowerVerificationDocumentType,
) {
  return (
    verification.documents.find(
      (doc) =>
        doc.documentType === documentType &&
        doc.status !== "superseded",
    ) ?? null
  );
}

function getLatestReplacementCandidateForType(
  verification: BorrowerVerificationSummary,
  documentType: BorrowerVerificationDocumentType,
) {
  return (
    verification.documents.find(
      (doc) =>
        doc.documentType === documentType &&
        (doc.status === "submitted" ||
          doc.status === "accepted" ||
          doc.status === "superseded"),
    ) ?? null
  );
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}
