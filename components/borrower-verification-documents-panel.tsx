"use client";

import type { ReactNode } from "react";
import {
  useActionState,
  useEffect,
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
import {
  borrowerFacingVerificationStateDescriptions,
  borrowerFacingVerificationStateLabels,
  borrowerVerificationDocumentStatusLabels,
  borrowerVerificationDocumentTypeDescriptions,
  borrowerVerificationDocumentTypeLabels,
  borrowerVerificationDocumentTypes,
  getBorrowerFacingVerificationState,
  requiredBorrowerVerificationDocumentTypes,
  type BorrowerFacingVerificationState,
  type BorrowerVerificationDocumentType,
  type BorrowerVerificationSummary,
} from "@/lib/borrower-verification";
import { consentTypeLabels, type ConsentStatus } from "@/lib/consents";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ToneBadge, type BadgeTone } from "@/components/borrower-status-badge";
import {
  ExternalLinkIcon,
  UploadIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type BorrowerVerificationDocumentsPanelProps = {
  verification: BorrowerVerificationSummary | null;
  consentStatus: ConsentStatus | null;
};

const initialState: BorrowerVerificationDocumentSubmitResult | null = null;

export function BorrowerVerificationDocumentsPanel({
  verification,
  consentStatus,
}: BorrowerVerificationDocumentsPanelProps) {
  const router = useRouter();
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentMessage, setConsentMessage] = useState("");
  const [isConsentPending, startConsentTransition] = useTransition();
  const [supportingOpen, setSupportingOpen] = useState(false);
  const [supportingDocType, setSupportingDocType] =
    useState<string>("address_proof");
  const supportingFormRef = useRef<HTMLFormElement>(null);
  const [supportingState, supportingFormAction, isSupportingUploadPending] =
    useActionState(submitBorrowerVerificationDocument, initialState);

  useEffect(() => {
    if (!supportingState?.ok) {
      return;
    }

    supportingFormRef.current?.reset();
    router.refresh();
  }, [router, supportingState]);

  if (!verification || verification.status === "missing") {
    return null;
  }

  const disclosuresCurrent = consentStatus?.isCurrent ?? false;
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

  function acceptDisclosures() {
    if (!consentStatus) {
      return;
    }

    setConsentMessage("");
    startConsentTransition(async () => {
      const result = await acceptUserConsentsAction(consentStatus.scope);

      setConsentMessage(result.message);

      if (result.ok) {
        setConsentChecked(false);
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
        consentStatus={consentStatus}
        consentChecked={consentChecked}
        consentMessage={consentMessage}
        isConsentPending={isConsentPending}
        onConsentCheckedChange={setConsentChecked}
        onAccept={acceptDisclosures}
      />

      <RequiredDocumentsSection
        verification={verification}
        canUpload={canUpload}
        disclosuresCurrent={disclosuresCurrent}
      />

      <WhatNextSection facingState={facingState} />

      <SupportingDocumentsSection
        verification={verification}
        canUpload={canUpload}
        disclosuresCurrent={disclosuresCurrent}
        isOpen={supportingOpen}
        onToggle={() => setSupportingOpen((prev) => !prev)}
        docType={supportingDocType}
        onDocTypeChange={setSupportingDocType}
        formRef={supportingFormRef}
        formAction={supportingFormAction}
        isPending={isSupportingUploadPending}
        submitState={supportingState}
      />

      <ApplicationReadinessBanner facingState={facingState} />
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

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Borrower verification</CardTitle>
          <ToneBadge tone={tone}>
            {borrowerFacingVerificationStateLabels[facingState]}
          </ToneBadge>
        </div>
        <CardDescription>
          {borrowerFacingVerificationStateDescriptions[facingState]}
        </CardDescription>
      </CardHeader>
      {facingState === "waiting_review" ? (
        <CardContent>
          <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            <Clock className="size-4 shrink-0" />
            No action needed right now.
          </div>
        </CardContent>
      ) : null}
      {verification.rejectionReason ? (
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              {verification.rejectionReason}
            </AlertDescription>
          </Alert>
        </CardContent>
      ) : null}
      {verification.managerReviewNotes ? (
        <CardContent>
          <Alert>
            <AlertDescription>
              {verification.managerReviewNotes}
            </AlertDescription>
          </Alert>
        </CardContent>
      ) : null}
    </Card>
  );
}

function DisclosuresSection({
  consentStatus,
  consentChecked,
  consentMessage,
  isConsentPending,
  onConsentCheckedChange,
  onAccept,
}: {
  consentStatus: ConsentStatus | null;
  consentChecked: boolean;
  consentMessage: string;
  isConsentPending: boolean;
  onConsentCheckedChange: (checked: boolean) => void;
  onAccept: () => void;
}) {
  if (!consentStatus) {
    return null;
  }

  if (consentStatus.isCurrent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Disclosures</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Disclosures accepted</p>
                <p className="text-xs text-muted-foreground">
                  Terms, Privacy Notice, and Document Processing Consent are
                  current.
                </p>
              </div>
            </div>
            <ToneBadge tone="success">Done</ToneBadge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Disclosures</CardTitle>
        <CardDescription>
          Accept these before uploading verification documents.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-1">
          {consentStatus.required.map((consent) => {
            const accepted = consentStatus.accepted.find(
              (item) =>
                item.consentType === consent.consentType &&
                item.version === consent.version,
            );

            return (
              <CompactRow
                key={`${consent.consentType}-${consent.version}`}
                label={consentTypeLabels[consent.consentType]}
                detail={
                  accepted
                    ? `Accepted ${formatDateTime(accepted.acceptedAt)}`
                    : "Not accepted"
                }
                badge={
                  <ToneBadge tone={accepted ? "success" : "attention"}>
                    {accepted ? "Accepted" : "Missing"}
                  </ToneBadge>
                }
              />
            );
          })}
        </div>

        <Separator />

        <div className="grid gap-3 rounded-xl bg-background px-4 py-3">
          <div className="flex items-start gap-3">
            <Checkbox
              id="verification-consent"
              checked={consentChecked}
              onCheckedChange={(checked) =>
                onConsentCheckedChange(checked === true)
              }
              className="mt-0.5"
            />
            <Label
              htmlFor="verification-consent"
              className="text-sm font-semibold leading-snug cursor-pointer"
            >
              I accept the required disclosures for verification.
            </Label>
          </div>
          <Button
            disabled={!consentChecked || isConsentPending}
            onClick={onAccept}
            className="w-fit rounded-full h-10 px-5 font-semibold"
          >
            {isConsentPending ? "Accepting..." : "Accept disclosures"}
          </Button>
          {consentMessage ? (
            <p
              className="text-sm leading-6 text-muted-foreground"
              role="status"
            >
              {consentMessage}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Required documents</CardTitle>
        <CardDescription>
          Upload both required documents to proceed with verification.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {requiredBorrowerVerificationDocumentTypes.map((docType) => (
          <RequiredDocumentCard
            key={docType}
            documentType={docType}
            verification={verification}
            canUpload={canUpload && disclosuresCurrent}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function RequiredDocumentCard({
  documentType,
  verification,
  canUpload,
}: {
  documentType: BorrowerVerificationDocumentType;
  verification: BorrowerVerificationSummary;
  canUpload: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    submitBorrowerVerificationDocument,
    initialState,
  );

  useEffect(() => {
    if (!state?.ok) {
      return;
    }

    formRef.current?.reset();
    router.refresh();
  }, [router, state]);

  const docStatus = getRequiredDocumentDisplayStatus(
    verification,
    documentType,
  );
  const latestDoc = getLatestDocumentForType(verification, documentType);
  const showUpload = canUpload && docStatus.state !== "accepted";

  return (
    <div className="rounded-xl border border-border/60 p-4 grid gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 grid gap-0.5">
          <p className="text-sm font-semibold">
            {borrowerVerificationDocumentTypeLabels[documentType]}
          </p>
          <p className="text-xs text-muted-foreground">
            {borrowerVerificationDocumentTypeDescriptions[documentType]}
          </p>
        </div>
        <ToneBadge tone={docStatus.tone}>{docStatus.label}</ToneBadge>
      </div>

      {latestDoc ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="size-3.5 shrink-0" />
          <span className="truncate">{latestDoc.fileName}</span>
          <span className="shrink-0">
            {formatFileSize(latestDoc.fileSize)}
          </span>
          {latestDoc.viewUrl ? (
            <Button variant="outline" size="sm" className="ml-auto h-7 text-xs" asChild>
              <a href={latestDoc.viewUrl} target="_blank" rel="noreferrer">
                <ExternalLinkIcon className="size-3" />
                View
              </a>
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
        <>
          <Separator />
          <form ref={formRef} action={formAction} className="grid gap-2">
            <input type="hidden" name="documentType" value={documentType} />
            <input
              name="documentFile"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-secondary-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              required
            />
            <p className="text-xs text-muted-foreground">
              JPG, PNG, WebP, or PDF. Up to 5 MB.
            </p>
            <Button
              type="submit"
              disabled={isPending}
              variant={docStatus.state === "rejected" ? "default" : "default"}
              className="w-fit rounded-full h-9 px-4 text-sm font-semibold"
            >
              <UploadIcon className="size-3.5" />
              {isPending
                ? "Uploading..."
                : docStatus.state === "rejected"
                  ? "Replace document"
                  : latestDoc
                    ? "Replace document"
                    : "Upload document"}
            </Button>
          </form>
        </>
      ) : null}

      {state ? (
        <p
          className={`rounded-lg border px-3 py-2 text-xs leading-5 ${
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
  );
}

function WhatNextSection({
  facingState,
}: {
  facingState: BorrowerFacingVerificationState;
}) {
  const messages: Record<BorrowerFacingVerificationState, string> = {
    missing_disclosures: "Accept the required disclosures first.",
    missing_documents: "Upload the required documents.",
    waiting_review: "A manager will review your documents.",
    under_review: "A manager is reviewing your documents.",
    needs_update: "Replace the rejected document.",
    approved: "You can now apply for financing.",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>What happens next</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {messages[facingState]}
        </p>
      </CardContent>
    </Card>
  );
}

function SupportingDocumentsSection({
  verification,
  canUpload,
  disclosuresCurrent,
  isOpen,
  onToggle,
  docType,
  onDocTypeChange,
  formRef,
  formAction,
  isPending,
  submitState,
}: {
  verification: BorrowerVerificationSummary;
  canUpload: boolean;
  disclosuresCurrent: boolean;
  isOpen: boolean;
  onToggle: () => void;
  docType: string;
  onDocTypeChange: (value: string) => void;
  formRef: React.RefObject<HTMLFormElement | null>;
  formAction: (payload: FormData) => void;
  isPending: boolean;
  submitState: BorrowerVerificationDocumentSubmitResult | null;
}) {
  const requiredSet = new Set<string>(requiredBorrowerVerificationDocumentTypes);
  const supportingDocs = verification.documents.filter(
    (doc) => !requiredSet.has(doc.documentType),
  );
  const optionalTypes = borrowerVerificationDocumentTypes.filter(
    (type) => !requiredSet.has(type),
  );

  const canAddSupporting = canUpload && disclosuresCurrent;

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="grid gap-0.5">
          <p className="text-sm font-medium">Supporting documents</p>
          <p className="text-xs text-muted-foreground">
            Optional documents to strengthen your verification.
          </p>
        </div>
        {isOpen ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>

      {isOpen ? (
        <div className="px-4 pb-4 grid gap-3">
          <Separator />

          {supportingDocs.length > 0 ? (
            <div className="grid gap-2">
              {supportingDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
                >
                  <div className="min-w-0 grid gap-0.5">
                    <p className="text-xs font-medium truncate">
                      {doc.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {
                        borrowerVerificationDocumentTypeLabels[
                          doc.documentType
                        ]
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {doc.viewUrl ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        asChild
                      >
                        <a href={doc.viewUrl} target="_blank" rel="noreferrer">
                          <ExternalLinkIcon className="size-3" />
                          View
                        </a>
                      </Button>
                    ) : null}
                    <ToneBadge tone={getDocumentTone(doc.status)}>
                      {borrowerVerificationDocumentStatusLabels[doc.status]}
                    </ToneBadge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No supporting documents uploaded yet.
            </p>
          )}

          {canAddSupporting ? (
            <>
              <Separator />
              <form
                ref={formRef}
                action={formAction}
                className="grid gap-2"
              >
                <div className="grid gap-1.5">
                  <Label
                    htmlFor="supportingDocType"
                    className="text-xs font-semibold"
                  >
                    Document type
                  </Label>
                  <input
                    type="hidden"
                    name="documentType"
                    value={docType}
                  />
                  <select
                    id="supportingDocType"
                    value={docType}
                    onChange={(e) => onDocTypeChange(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    {optionalTypes.map((type) => (
                      <option key={type} value={type}>
                        {borrowerVerificationDocumentTypeLabels[type]}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {
                      borrowerVerificationDocumentTypeDescriptions[
                        docType as keyof typeof borrowerVerificationDocumentTypeDescriptions
                      ]
                    }
                  </p>
                </div>
                <div className="grid gap-1.5">
                  <Label
                    htmlFor="supportingFile"
                    className="text-xs font-semibold"
                  >
                    File
                  </Label>
                  <input
                    id="supportingFile"
                    name="documentFile"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-secondary-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isPending}
                  variant="outline"
                  className="w-fit rounded-full h-9 px-4 text-sm font-semibold"
                >
                  <UploadIcon className="size-3.5" />
                  {isPending ? "Uploading..." : "Upload supporting document"}
                </Button>
              </form>
            </>
          ) : null}

          {submitState ? (
            <p
              className={`rounded-lg border px-3 py-2 text-xs leading-5 ${
                submitState.ok
                  ? "border-border bg-muted/30 text-muted-foreground"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
              role="status"
            >
              {submitState.message}
            </p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function ApplicationReadinessBanner({
  facingState,
}: {
  facingState: BorrowerFacingVerificationState;
}) {
  const isApproved = facingState === "approved";

  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm ${
        isApproved
          ? "bg-emerald-50 text-emerald-800"
          : "bg-muted/50 text-muted-foreground"
      }`}
    >
      {isApproved ? (
        <CheckCircle2 className="size-4 shrink-0" />
      ) : (
        <AlertCircle className="size-4 shrink-0" />
      )}
      {isApproved
        ? "Verification approved. You can now apply for financing."
        : "Loan applications unlock after verification approval."}
    </div>
  );
}

function CompactRow({
  badge,
  detail,
  label,
}: {
  badge: ReactNode;
  detail: string;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      <div className="shrink-0">{badge}</div>
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

function getDocumentTone(
  status: BorrowerVerificationSummary["documents"][number]["status"],
): BadgeTone {
  if (status === "accepted") {
    return "success";
  }

  if (status === "rejected") {
    return "danger";
  }

  return "neutral";
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
