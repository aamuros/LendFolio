"use client";

import type { AppNotification } from "@/lib/notifications";
import { NotificationList } from "./notification-list";
import { NotificationsEmptyState } from "./notifications-empty-state";
import { NotificationsSkeleton } from "./notifications-loading";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCheck, AlertCircle } from "lucide-react";

export function NotificationPanelContent({
  notifications,
  unreadCount,
  message,
  isPending,
  activeNotificationId,
  onOpenNotification,
  onMarkAllRead,
}: {
  notifications: AppNotification[];
  unreadCount: number;
  message: string;
  isPending: boolean;
  activeNotificationId: string | null;
  onOpenNotification: (notification: AppNotification) => void;
  onMarkAllRead: () => void;
}) {
  return (
    <div className="flex max-h-[min(32rem,calc(100svh-6rem))] flex-col">
      <div className="shrink-0 bg-popover">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="grid gap-0.5">
            <h2 className="text-sm font-semibold">Notifications</h2>
            {unreadCount > 0 ? (
              <p className="text-xs text-muted-foreground">
                {unreadCount} unread
              </p>
            ) : null}
          </div>
          {unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={onMarkAllRead}
              disabled={isPending}
              className="gap-1 text-muted-foreground"
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </Button>
          ) : null}
        </div>
        <Separator />
      </div>

      {message ? (
        <div className="shrink-0 px-4 py-3">
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        </div>
      ) : null}

      {!message && isPending && notifications.length === 0 ? (
        <NotificationsSkeleton count={3} />
      ) : null}

      {!message && !isPending && notifications.length === 0 ? (
        <NotificationsEmptyState />
      ) : null}

      {!message && notifications.length > 0 ? (
        <ScrollArea className="min-h-0 flex-1">
          <NotificationList
            notifications={notifications}
            activeNotificationId={activeNotificationId}
            onOpenNotification={onOpenNotification}
          />
        </ScrollArea>
      ) : null}
    </div>
  );
}
