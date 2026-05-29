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
  borrowerVerificationDocumentStatusLabels,
  borrowerVerificationDocumentTypeLabels,
  borrowerVerificationDocumentTypes,
  borrowerVerificationStatusLabels,
  type BorrowerVerificationSummary,
} from "@/lib/borrower-verification";
import { consentTypeLabels, type ConsentStatus } from "@/lib/consents";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToneBadge } from "@/components/borrower-status-badge";

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
  const formRef = useRef<HTMLFormElement>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentMessage, setConsentMessage] = useState("");
  const [documentType, setDocumentType] = useState<string>(
    borrowerVerificationDocumentTypes[0],
  );
  const [isConsentPending, startConsentTransition] = useTransition();
  const [state, formAction, isUploadPending] = useActionState(
    submitBorrowerVerificationDocument,
    initialState,
  );
  const canUpload = [
    "not_started",
    "pending",
    "pending_documents",
    "rejected",
    "needs_resubmission",
  ].includes(verification?.status ?? "");

  useEffect(() => {
    if (!state?.ok) {
      return;
    }

    formRef.current?.reset();
    router.refresh();
  }, [router, state]);

  if (!verification || verification.status === "missing") {
    return null;
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
        setConsentChecked(false);
        router.refresh();
      }
    });
  }

  return (
    <Card className="rounded-2xl">
      <CardContent className="grid gap-5 p-5">
        <VerificationSection>
          <div className="grid gap-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold">Borrower verification</h3>
              <ToneBadge tone={getVerificationTone(verification.status)}>
                {getVerificationLabel(verification)}
              </ToneBadge>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {getVerificationDescription(verification)}
            </p>
            {verification.rejectionReason ? (
              <Alert variant="destructive" className="mt-1">
                <AlertDescription>{verification.rejectionReason}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        </VerificationSection>

        {consentStatus ? (
          <VerificationSection
            title="Required disclosures"
            description="Accept these before uploading verification documents."
          >
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

            {!consentStatus.isCurrent ? (
              <div className="grid gap-3 rounded-2xl bg-background px-4 py-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="verification-consent"
                    checked={consentChecked}
                    onCheckedChange={(checked) => setConsentChecked(checked === true)}
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
                  onClick={acceptDisclosures}
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
            ) : null}
          </VerificationSection>
        ) : null}

        <VerificationSection title="Verification checklist">
          <div className="grid gap-1">
            <CompactRow
              label="Required disclosures"
              detail={
                consentStatus?.isCurrent
                  ? "All required disclosures are accepted."
                  : "Accept Terms, Privacy Notice, and Document Processing Consent."
              }
              badge={
                <ToneBadge
                  tone={consentStatus?.isCurrent ? "success" : "attention"}
                >
                  {consentStatus?.isCurrent ? "Done" : "Pending"}
                </ToneBadge>
              }
            />
            {verification.documentPolicy.requiredDocumentTypes.map((documentType) => {
              const status = getRequiredDocumentStatus(verification, documentType);

              return (
                <CompactRow
                  key={documentType}
                  label={borrowerVerificationDocumentTypeLabels[documentType]}
                  detail={status.detail}
                  badge={
                    <ToneBadge tone={status.tone}>{status.label}</ToneBadge>
                  }
                />
              );
            })}
            <CompactRow
              label="Manager review"
              detail={
                verification.status === "approved"
                  ? "Manager review is complete."
                  : verification.documentPolicy.readyForManagerReview
                    ? "Documents are ready for manager review."
                    : "Complete required documents first."
              }
              badge={
                <ToneBadge
                  tone={verification.status === "approved" ? "success" : "neutral"}
                >
                  {verification.status === "approved" ? "Done" : "Pending"}
                </ToneBadge>
              }
            />
            <CompactRow
              label="Application readiness"
              detail={
                verification.status === "approved" &&
                verification.documentPolicy.documentsAccepted
                  ? "Loan submission is available."
                  : "Loan submission opens after verification approval."
              }
              badge={
                <ToneBadge
                  tone={
                    verification.status === "approved" &&
                    verification.documentPolicy.documentsAccepted
                      ? "success"
                      : "neutral"
                  }
                >
                  {verification.status === "approved" &&
                  verification.documentPolicy.documentsAccepted
                    ? "Ready"
                    : "Locked"}
                </ToneBadge>
              }
            />
          </div>
        </VerificationSection>

        <VerificationSection title="Uploaded documents">
          {verification.documents.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border px-3 py-3 text-sm leading-6 text-muted-foreground">
              No verification documents uploaded.
            </p>
          ) : (
            <div className="grid gap-1">
              {verification.documents.map((document) => (
                <CompactRow
                  key={document.id}
                  label={document.fileName}
                  detail={`${borrowerVerificationDocumentTypeLabels[document.documentType]} - ${formatFileSize(document.fileSize)}`}
                  note={document.reviewNotes}
                  badge={
                    <ToneBadge tone={getDocumentTone(document.status)}>
                      {borrowerVerificationDocumentStatusLabels[document.status]}
                    </ToneBadge>
                  }
                />
              ))}
            </div>
          )}
        </VerificationSection>

        <VerificationSection
          title={canUpload ? "Upload document" : getActionSectionTitle(verification)}
        >
          {canUpload ? (
            <form ref={formRef} action={formAction} className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="documentType" className="text-sm font-semibold">
                  Document type
                </Label>
                <input type="hidden" name="documentType" value={documentType} />
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger id="documentType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {borrowerVerificationDocumentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {borrowerVerificationDocumentTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="documentFile" className="text-sm font-semibold">
                  File
                </Label>
                <input
                  id="documentFile"
                  name="documentFile"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-secondary-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={isUploadPending || consentStatus?.isCurrent === false}
                className="w-full rounded-full h-11 font-semibold sm:w-fit"
              >
                {isUploadPending ? "Uploading..." : "Upload document"}
              </Button>
            </form>
          ) : (
            <p className="rounded-2xl bg-background px-4 py-3 text-sm leading-6 text-muted-foreground">
              {getActionSectionMessage(verification)}
            </p>
          )}

          {state ? (
            <p
              className={`rounded-2xl border px-3 py-2 text-sm leading-6 ${
                state.ok
                  ? "border-border bg-muted/30 text-muted-foreground"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
              role="status"
            >
              {state.message}
            </p>
          ) : null}
        </VerificationSection>
      </CardContent>
    </Card>
  );
}

function VerificationSection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title?: string;
}) {
  return (
    <section className="grid gap-3 border-b border-border pb-5 last:border-b-0 last:pb-0">
      {title || description ? (
        <div className="grid gap-1">
          {title ? <h3 className="text-base font-semibold">{title}</h3> : null}
          {description ? (
            <p className="text-sm leading-5 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function CompactRow({
  badge,
  detail,
  label,
  note,
}: {
  badge: ReactNode;
  detail: string;
  label: string;
  note?: string | null;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-border py-2.5 last:border-b-0">
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold leading-5">{label}</p>
        <p className="text-xs leading-5 text-muted-foreground">
          {detail}
        </p>
        {note ? (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {note}
          </p>
        ) : null}
      </div>
      <div className="pt-0.5">{badge}</div>
    </div>
  );
}

function getVerificationLabel(verification: BorrowerVerificationSummary) {
  if (verification.status === "missing") {
    return "Not started";
  }

  if (
    verification.status !== "approved" &&
    verification.documentPolicy.missingRequiredDocumentTypes.length > 0
  ) {
    return "Missing documents";
  }

  return borrowerVerificationStatusLabels[verification.status];
}

function getVerificationDescription(verification: BorrowerVerificationSummary) {
  if (verification.status === "approved") {
    return "Your borrower profile is complete.";
  }

  if (
    verification.status === "rejected" ||
    verification.status === "needs_resubmission"
  ) {
    return "Upload the missing documents to continue.";
  }

  if (verification.documentPolicy.readyForManagerReview) {
    return "Your documents are waiting for manager review.";
  }

  return "Upload the missing documents to continue.";
}

function getVerificationTone(status: BorrowerVerificationSummary["status"]) {
  if (status === "approved") {
    return "success" as const;
  }

  if (status === "rejected" || status === "needs_resubmission") {
    return "danger" as const;
  }

  return "attention" as const;
}

function getRequiredDocumentStatus(
  verification: BorrowerVerificationSummary,
  documentType: BorrowerVerificationSummary["documentPolicy"]["requiredDocumentTypes"][number],
) {
  if (verification.documentPolicy.acceptedDocumentTypes.includes(documentType)) {
    return {
      label: "Done",
      detail: "Accepted for verification.",
      tone: "success" as const,
    };
  }

  if (verification.documentPolicy.rejectedDocumentTypes.includes(documentType)) {
    return {
      label: "Needs review",
      detail: "Upload an updated document.",
      tone: "danger" as const,
    };
  }

  if (verification.documentPolicy.submittedDocumentTypes.includes(documentType)) {
    return {
      label: "Submitted",
      detail: "Waiting for manager acceptance.",
      tone: "neutral" as const,
    };
  }

  return {
    label: "Missing",
    detail: "Upload this document.",
    tone: "attention" as const,
  };
}

function getDocumentTone(
  status: BorrowerVerificationSummary["documents"][number]["status"],
) {
  if (status === "accepted") {
    return "success" as const;
  }

  if (status === "rejected") {
    return "danger" as const;
  }

  return "neutral" as const;
}

function getActionSectionTitle(verification: BorrowerVerificationSummary) {
  return verification.status === "approved"
    ? "Verification complete"
    : "Review in progress";
}

function getActionSectionMessage(verification: BorrowerVerificationSummary) {
  return verification.status === "approved"
    ? "Your borrower verification is approved. No document upload is needed."
    : "Your documents are already submitted. No action is needed right now.";
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
