import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const notificationTypeLabels: Record<string, string> = {
  offer_received: "Offer",
  offer_accepted: "Accepted",
  offer_declined: "Declined",
  repayment_proof_submitted: "Proof",
  repayment_verified: "Verified",
  repayment_rejected: "Rejected",
  repayment_late: "Late",
  loan_overdue: "Overdue",
  loan_restored_active: "Restored",
  loan_paid: "Paid",
  verification_approved: "Verified",
  verification_rejected: "Rejected",
  verification_update: "Verification",
  verification_document_submitted: "Document",
  lender_approved: "Approved",
  lender_rejected: "Rejected",
  lender_review_update: "Verification",
  lender_onboarding_submitted: "Onboarding",
  document_accepted: "Document",
  document_rejected: "Document",
  application_submitted: "Application",
  application_withdrawn: "Withdrawn",
  application_updated: "Updated",
};

const notificationTypeStyles: Record<string, string> = {
  offer_received: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  offer_accepted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  offer_declined: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  repayment_proof_submitted: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  repayment_verified: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  repayment_rejected: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  repayment_late: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  loan_overdue: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  loan_restored_active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  loan_paid: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  verification_approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  verification_rejected: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  verification_update: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  verification_document_submitted: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  lender_approved: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  lender_rejected: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  lender_review_update: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  lender_onboarding_submitted: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  document_accepted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  document_rejected: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  application_submitted: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  application_withdrawn: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  application_updated: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
};

export function NotificationTypeBadge({ type }: { type: string }) {
  const label = notificationTypeLabels[type];
  if (!label) return null;

  const style = notificationTypeStyles[type];

  return (
    <Badge
      variant="secondary"
      className={cn("text-[10px] font-semibold border-transparent", style)}
    >
      {label}
    </Badge>
  );
}
