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
