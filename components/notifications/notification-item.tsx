"use client";

import {
  formatNotificationDate,
  type AppNotification,
} from "@/lib/notifications";
import { NotificationTypeBadge } from "./notification-type-badge";
import {
  ChevronRight,
  CircleDollarSign,
  CircleCheckBig,
  XCircle,
  Upload,
  ClockAlert,
  ShieldCheck,
  ShieldAlert,
  FileCheck,
  FileText,
  Building2,
  CheckCircle,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type CategoryConfig = {
  icon: LucideIcon;
  bg: string;
  border: string;
  text: string;
};

const categoryConfig: Record<string, CategoryConfig> = {
  offer_received: {
    icon: CircleDollarSign,
    bg: "bg-[#EFF3EA]",
    border: "border-[#C9D7C6]",
    text: "text-[#33423C]",
  },
  offer_accepted: {
    icon: CircleCheckBig,
    bg: "bg-[#EFF3EA]",
    border: "border-[#C9D7C6]",
    text: "text-[#33423C]",
  },
  offer_declined: {
    icon: XCircle,
    bg: "bg-[#FFF4F1]",
    border: "border-[#D9A7A0]",
    text: "text-[#8A2A1E]",
  },
  repayment_proof_submitted: {
    icon: Upload,
    bg: "bg-[#F8F1DD]",
    border: "border-[#E2DAC6]",
    text: "text-[#6A4B17]",
  },
  repayment_verified: {
    icon: CircleCheckBig,
    bg: "bg-[#EFF3EA]",
    border: "border-[#C9D7C6]",
    text: "text-[#33423C]",
  },
  repayment_rejected: {
    icon: XCircle,
    bg: "bg-[#FFF4F1]",
    border: "border-[#D9A7A0]",
    text: "text-[#8A2A1E]",
  },
  repayment_late: {
    icon: ClockAlert,
    bg: "bg-[#F8F1DD]",
    border: "border-[#E2DAC6]",
    text: "text-[#6A4B17]",
  },
  loan_overdue: {
    icon: ClockAlert,
    bg: "bg-[#FFF4F1]",
    border: "border-[#D9A7A0]",
    text: "text-[#8A2A1E]",
  },
  verification_approved: {
    icon: ShieldCheck,
    bg: "bg-[#EFF3EA]",
    border: "border-[#C9D7C6]",
    text: "text-[#33423C]",
  },
  verification_rejected: {
    icon: ShieldAlert,
    bg: "bg-[#FFF4F1]",
    border: "border-[#D9A7A0]",
    text: "text-[#8A2A1E]",
  },
  verification_update: {
    icon: FileCheck,
    bg: "bg-[#F8F7F3]",
    border: "border-[#D9D7D1]",
    text: "text-[#55534F]",
  },
  lender_approved: {
    icon: Building2,
    bg: "bg-[#EFF3EA]",
    border: "border-[#C9D7C6]",
    text: "text-[#33423C]",
  },
  lender_rejected: {
    icon: XCircle,
    bg: "bg-[#FFF4F1]",
    border: "border-[#D9A7A0]",
    text: "text-[#8A2A1E]",
  },
  lender_review_update: {
    icon: FileCheck,
    bg: "bg-[#F8F7F3]",
    border: "border-[#D9D7D1]",
    text: "text-[#55534F]",
  },
  document_accepted: {
    icon: FileCheck,
    bg: "bg-[#EFF3EA]",
    border: "border-[#C9D7C6]",
    text: "text-[#33423C]",
  },
  document_rejected: {
    icon: FileCheck,
    bg: "bg-[#FFF4F1]",
    border: "border-[#D9A7A0]",
    text: "text-[#8A2A1E]",
  },
  application_submitted: {
    icon: FileText,
    bg: "bg-[#EFF3EA]",
    border: "border-[#C9D7C6]",
    text: "text-[#33423C]",
  },
  application_withdrawn: {
    icon: XCircle,
    bg: "bg-[#F8F7F3]",
    border: "border-[#D9D7D1]",
    text: "text-[#55534F]",
  },
  application_updated: {
    icon: FileText,
    bg: "bg-[#EFF3EA]",
    border: "border-[#C9D7C6]",
    text: "text-[#33423C]",
  },
  verification_document_submitted: {
    icon: Upload,
    bg: "bg-[#F8F1DD]",
    border: "border-[#E2DAC6]",
    text: "text-[#6A4B17]",
  },
  lender_onboarding_submitted: {
    icon: Building2,
    bg: "bg-[#F8F1DD]",
    border: "border-[#E2DAC6]",
    text: "text-[#6A4B17]",
  },
  loan_restored_active: {
    icon: CheckCircle,
    bg: "bg-[#EFF3EA]",
    border: "border-[#C9D7C6]",
    text: "text-[#33423C]",
  },
  loan_paid: {
    icon: CircleCheckBig,
    bg: "bg-[#EFF3EA]",
    border: "border-[#C9D7C6]",
    text: "text-[#33423C]",
  },
  lender_profile_change_approved: {
    icon: Building2,
    bg: "bg-[#EFF3EA]",
    border: "border-[#C9D7C6]",
    text: "text-[#33423C]",
  },
  lender_profile_change_rejected: {
    icon: XCircle,
    bg: "bg-[#FFF4F1]",
    border: "border-[#D9A7A0]",
    text: "text-[#8A2A1E]",
  },
};

const accentBorderMap: Record<string, string> = {
  offer_received: "border-l-[#33423C]",
  offer_accepted: "border-l-[#33423C]",
  offer_declined: "border-l-[#8A2A1E]",
  repayment_proof_submitted: "border-l-[#9A6B1D]",
  repayment_verified: "border-l-[#33423C]",
  repayment_rejected: "border-l-[#8A2A1E]",
  repayment_late: "border-l-[#9A6B1D]",
  loan_overdue: "border-l-[#8A2A1E]",
  verification_approved: "border-l-[#33423C]",
  verification_rejected: "border-l-[#8A2A1E]",
  verification_update: "border-l-[#D9D7D1]",
  lender_approved: "border-l-[#33423C]",
  lender_rejected: "border-l-[#8A2A1E]",
  lender_review_update: "border-l-[#D9D7D1]",
  document_accepted: "border-l-[#33423C]",
  document_rejected: "border-l-[#8A2A1E]",
  application_submitted: "border-l-[#33423C]",
  application_withdrawn: "border-l-[#D9D7D1]",
  application_updated: "border-l-[#33423C]",
  verification_document_submitted: "border-l-[#9A6B1D]",
  lender_onboarding_submitted: "border-l-[#9A6B1D]",
  loan_restored_active: "border-l-[#33423C]",
  loan_paid: "border-l-[#33423C]",
  lender_profile_change_approved: "border-l-[#33423C]",
  lender_profile_change_rejected: "border-l-[#8A2A1E]",
};

export function NotificationItem({
  notification,
  isActive,
  onRead,
}: {
  notification: AppNotification;
  isActive: boolean;
  onRead: (notification: AppNotification) => void;
}) {
  const config = categoryConfig[notification.type] ?? {
    icon: CircleDollarSign,
    bg: "bg-[#F8F7F3]",
    border: "border-[#D9D7D1]",
    text: "text-[#55534F]",
  };
  const Icon = config.icon;
  const accentBorder =
    accentBorderMap[notification.type] ?? "border-l-[#D9D7D1]";

  const handleClick = () => {
    if (notification.isUnread) {
      onRead(notification);
    }
  };

  const content = (
    <>
      <span
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border shadow-[0_8px_24px_rgba(14,26,18,0.05)]",
          config.bg,
          config.border,
        )}
      >
        {isActive ? (
          <Loader2 className={cn("size-4 animate-spin", config.text)} />
        ) : (
          <Icon aria-hidden="true" className={cn("size-4", config.text)} />
        )}
      </span>
      <span className="grid min-w-0 gap-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "text-sm",
              notification.isUnread
                ? "font-semibold text-foreground"
                : "font-medium text-foreground/80",
            )}
          >
            {notification.title}
          </span>
          <NotificationTypeBadge type={notification.type} />
        </span>
        <span className="text-sm leading-5 text-muted-foreground line-clamp-2">
          {notification.message}
        </span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {formatNotificationDate(notification.createdAt)}
          {notification.isUnread ? (
            <span className="font-semibold text-primary">Unread</span>
          ) : null}
        </span>
      </span>
      {notification.href ? (
        <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" />
      ) : null}
    </>
  );

  const sharedClassName = cn(
    "group grid w-full grid-cols-[auto_1fr_auto] items-start gap-3 px-4 py-4 text-left transition sm:px-5",
    "hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-ring",
    "border-l-[3px]",
    notification.isUnread
      ? cn("bg-[#EFF3EA]/55", accentBorder)
      : "border-l-transparent",
  );

  if (notification.href) {
    return (
      <a
        href={notification.href}
        onClick={handleClick}
        className={sharedClassName}
      >
        {content}
      </a>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={sharedClassName}
    >
      {content}
    </div>
  );
}
