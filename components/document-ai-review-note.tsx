import type { DocumentAiReviewSummary } from "@/lib/ai/document-review";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusLabels: Record<DocumentAiReviewSummary["aiReviewStatus"], string> = {
  not_run: "Not run",
  pass: "Pass",
  needs_manual_review: "Needs manual review",
  fail: "Fail",
  error: "Manual review only",
};

const detectedTypeLabels: Record<string, string> = {
  valid_id: "Valid ID",
  business_proof: "Business proof",
  address_proof: "Address proof",
  business_registration: "Business registration",
  authorization_letter: "Authorization letter",
  lending_license: "Lending license",
  proof_of_address: "Proof of address",
  other: "Other",
  unknown: "Unknown",
};

export function DocumentAiReviewNote({
  review,
  className,
}: {
  review: DocumentAiReviewSummary;
  className?: string;
}) {
  if (review.aiReviewStatus === "not_run") {
    return null;
  }

  return (
    <div
      className={cn(
        "mt-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs",
        className,
      )}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className="font-medium text-foreground">AI Result</span>
        <Badge
          variant={
            review.aiReviewStatus === "fail"
              ? "destructive"
              : review.aiReviewStatus === "pass"
                ? "default"
                : "secondary"
          }
          className={
            review.aiReviewStatus === "pass"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
              : undefined
          }
        >
          {statusLabels[review.aiReviewStatus]}
        </Badge>
      </div>

      <dl className="grid gap-1 text-muted-foreground">
        <div className="flex flex-wrap gap-x-1">
          <dt className="font-medium text-foreground">Detected Type:</dt>
          <dd>
            {detectedTypeLabels[review.aiDetectedDocumentType ?? "unknown"] ??
              "Unknown"}
          </dd>
        </div>
        <div className="flex flex-wrap gap-x-1">
          <dt className="font-medium text-foreground">Confidence:</dt>
          <dd>
            {typeof review.aiReviewConfidence === "number"
              ? `${Math.round(review.aiReviewConfidence * 100)}%`
              : "Not available"}
          </dd>
        </div>
        <div className="flex flex-wrap gap-x-1">
          <dt className="font-medium text-foreground">Risk Flags:</dt>
          <dd>
            {review.aiRiskFlags.length > 0
              ? review.aiRiskFlags.map(formatRiskFlag).join(", ")
              : "None"}
          </dd>
        </div>
        {review.aiReviewReason ? (
          <div className="grid gap-0.5">
            <dt className="font-medium text-foreground">Reason:</dt>
            <dd>{review.aiReviewReason}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

function formatRiskFlag(flag: string) {
  return flag.replace(/_/g, " ");
}
