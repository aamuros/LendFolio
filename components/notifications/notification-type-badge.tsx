import { Badge } from "@/components/ui/badge";

const notificationTypeLabels: Record<string, string> = {
  offer_received: "Offer",
  offer_accepted: "Accepted",
  offer_declined: "Declined",
  repayment_proof_submitted: "Proof",
  repayment_verified: "Verified",
  repayment_rejected: "Rejected",
  repayment_late: "Late",
  loan_overdue: "Overdue",
  verification_approved: "Verified",
  verification_rejected: "Rejected",
  verification_update: "Verification",
  lender_approved: "Approved",
  lender_rejected: "Rejected",
  lender_review_update: "Verification",
  document_accepted: "Document",
  document_rejected: "Document",
};

const notificationTypeTones: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  offer_received: "default",
  offer_accepted: "secondary",
  offer_declined: "destructive",
  repayment_proof_submitted: "secondary",
  repayment_verified: "secondary",
  repayment_rejected: "destructive",
  repayment_late: "destructive",
  loan_overdue: "destructive",
  verification_approved: "secondary",
  verification_rejected: "destructive",
  verification_update: "outline",
  lender_approved: "secondary",
  lender_rejected: "destructive",
  lender_review_update: "outline",
  document_accepted: "secondary",
  document_rejected: "destructive",
};

export function NotificationTypeBadge({ type }: { type: string }) {
  const label = notificationTypeLabels[type];
  if (!label) return null;

  return (
    <Badge
      variant={notificationTypeTones[type] ?? "outline"}
      className="text-[10px] font-semibold"
    >
      {label}
    </Badge>
  );
}
