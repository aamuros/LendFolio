import type { DocumentAiReviewSummary } from "@/lib/ai/document-review";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const statusLabels: Record<DocumentAiReviewSummary["aiReviewStatus"], string> = {
  not_run: "Not checked",
  pass: "Looks acceptable",
  needs_manual_review: "Needs manual review",
  fail: "Mismatch detected",
  error: "AI unavailable",
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
  return (
    <Card
      size="sm"
      className={cn(
        "mt-2 gap-2 py-2 text-xs shadow-none",
        className,
      )}
    >
      <CardContent className="space-y-2 px-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">AI Pre-screen</span>
          <Badge variant={getStatusVariant(review.aiReviewStatus)}>
            {statusLabels[review.aiReviewStatus]}
          </Badge>
        </div>

        <dl className="grid gap-1 text-muted-foreground">
          <div className="flex flex-wrap gap-x-1">
            <dt className="font-medium text-foreground">Detected type:</dt>
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
            <dt className="font-medium text-foreground">Risk flags:</dt>
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
      </CardContent>
    </Card>
  );
}

function formatRiskFlag(flag: string) {
  return flag.replace(/_/g, " ");
}

function getStatusVariant(status: DocumentAiReviewSummary["aiReviewStatus"]) {
  if (status === "fail") return "destructive";
  if (status === "not_run") return "outline";
  return "secondary";
}
