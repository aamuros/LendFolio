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
  lender_profile_change_approved: "Approved",
  lender_profile_change_rejected: "Rejected",
};

const notificationTypeStyles: Record<string, string> = {
  offer_received: "border-[#C9D7C6] bg-[#EFF3EA] text-[#33423C]",
  offer_accepted: "border-[#C9D7C6] bg-[#EFF3EA] text-[#33423C]",
  offer_declined: "border-[#D9A7A0] bg-[#FFF4F1] text-[#8A2A1E]",
  repayment_proof_submitted: "border-[#E2DAC6] bg-[#F8F1DD] text-[#6A4B17]",
  repayment_verified: "border-[#C9D7C6] bg-[#EFF3EA] text-[#33423C]",
  repayment_rejected: "border-[#D9A7A0] bg-[#FFF4F1] text-[#8A2A1E]",
  repayment_late: "border-[#E2DAC6] bg-[#F8F1DD] text-[#6A4B17]",
  loan_overdue: "border-[#D9A7A0] bg-[#FFF4F1] text-[#8A2A1E]",
  loan_restored_active: "border-[#C9D7C6] bg-[#EFF3EA] text-[#33423C]",
  loan_paid: "border-[#C9D7C6] bg-[#EFF3EA] text-[#33423C]",
  verification_approved: "border-[#C9D7C6] bg-[#EFF3EA] text-[#33423C]",
  verification_rejected: "border-[#D9A7A0] bg-[#FFF4F1] text-[#8A2A1E]",
  verification_update: "border-[#D9D7D1] bg-[#F8F7F3] text-[#55534F]",
  verification_document_submitted: "border-[#E2DAC6] bg-[#F8F1DD] text-[#6A4B17]",
  lender_approved: "border-[#C9D7C6] bg-[#EFF3EA] text-[#33423C]",
  lender_rejected: "border-[#D9A7A0] bg-[#FFF4F1] text-[#8A2A1E]",
  lender_review_update: "border-[#D9D7D1] bg-[#F8F7F3] text-[#55534F]",
  lender_onboarding_submitted: "border-[#E2DAC6] bg-[#F8F1DD] text-[#6A4B17]",
  document_accepted: "border-[#C9D7C6] bg-[#EFF3EA] text-[#33423C]",
  document_rejected: "border-[#D9A7A0] bg-[#FFF4F1] text-[#8A2A1E]",
  application_submitted: "border-[#C9D7C6] bg-[#EFF3EA] text-[#33423C]",
  application_withdrawn: "border-[#D9D7D1] bg-[#F8F7F3] text-[#55534F]",
  application_updated: "border-[#C9D7C6] bg-[#EFF3EA] text-[#33423C]",
  lender_profile_change_approved: "border-[#C9D7C6] bg-[#EFF3EA] text-[#33423C]",
  lender_profile_change_rejected: "border-[#D9A7A0] bg-[#FFF4F1] text-[#8A2A1E]",
};

export function NotificationTypeBadge({ type }: { type: string }) {
  const label = notificationTypeLabels[type];
  if (!label) return null;

  const style = notificationTypeStyles[type];

  return (
    <Badge
      variant="secondary"
      className={cn("border text-[10px] font-semibold", style)}
    >
      {label}
    </Badge>
  );
}
