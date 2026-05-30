"use client";

import {
  formatNotificationDate,
  type AppNotification,
} from "@/lib/notifications";
import { NotificationTypeBadge } from "./notification-type-badge";
import { ChevronRight, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function NotificationItem({
  notification,
  isActive,
  onOpen,
}: {
  notification: AppNotification;
  isActive: boolean;
  onOpen: (notification: AppNotification) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => void onOpen(notification)}
      disabled={isActive}
      className={cn(
        "group grid w-full grid-cols-[auto_1fr_auto] items-start gap-3 px-4 py-3 text-left transition",
        "hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-ring disabled:opacity-70",
        notification.isUnread && "bg-primary/[0.03]",
      )}
    >
      <span className="mt-1 flex shrink-0 items-center">
        {isActive ? (
          <Loader2 className="size-2.5 animate-spin text-muted-foreground" />
        ) : (
          <Circle
            aria-hidden="true"
            className={cn(
              "size-2.5",
              notification.isUnread
                ? "fill-primary text-primary"
                : "fill-border text-border",
            )}
          />
        )}
      </span>
      <span className="grid min-w-0 gap-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground">
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
    </button>
  );
}
