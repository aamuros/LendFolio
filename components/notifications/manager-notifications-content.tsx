"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  loadNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/notifications/actions";
import type { AppNotification } from "@/lib/notifications";
import { NotificationList } from "@/components/notifications/notification-list";
import { NotificationsSkeleton } from "@/components/notifications/notifications-loading";
import { NotificationsEmptyState } from "@/components/notifications/notifications-empty-state";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCheck, AlertCircle } from "lucide-react";

export function ManagerNotificationsContent() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [message, setMessage] = useState("");
  const [activeNotificationId, setActiveNotificationId] = useState<
    string | null
  >(null);
  const [isPending, startTransition] = useTransition();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const loadNotifications = useCallback(() => {
    startTransition(() => {
      void loadNotificationsAction().then((result) => {
        setIsInitialLoad(false);
        if (!result.ok) {
          setMessage("Could not load notifications.");
          setNotifications([]);
          setUnreadCount(0);
          return;
        }

        setMessage("");
        setNotifications(result.notifications);
        setUnreadCount(result.unreadCount);
      });
    });
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markAllRead = useCallback(() => {
    startTransition(() => {
      void markAllNotificationsReadAction().then((result) => {
        if (!result.ok) {
          setMessage("Could not update notifications.");
          return;
        }

        setMessage("");
        setUnreadCount(0);
        setNotifications((current) =>
          current.map((notification) => ({
            ...notification,
            readAt: notification.readAt ?? result.readAt,
            isUnread: false,
          })),
        );
      });
    });
  }, []);

  const openNotification = useCallback(
    async (notification: AppNotification) => {
      setActiveNotificationId(notification.id);

      if (!notification.readAt) {
        const result = await markNotificationReadAction(notification.id);

        if (!result.ok) {
          setMessage("Could not update notification.");
          setActiveNotificationId(null);
          return;
        }

        setMessage("");
        setUnreadCount((current) => Math.max(0, current - 1));
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? {
                  ...item,
                  readAt: result.readAt,
                  isUnread: false,
                }
              : item,
          ),
        );
      }

      setActiveNotificationId(null);

      if (notification.href) {
        router.push(notification.href);
      }
    },
    [router],
  );

  return (
    <div className="grid gap-4">
      {unreadCount > 0 ? (
        <div className="flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            disabled={isPending}
            className="gap-1.5"
          >
            <CheckCheck className="size-4" />
            Mark all read
          </Button>
        </div>
      ) : null}

      {message ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      {!message && isInitialLoad ? (
        <NotificationsSkeleton count={6} />
      ) : null}

      {!message && !isInitialLoad && notifications.length === 0 ? (
        <NotificationsEmptyState />
      ) : null}

      {!message && notifications.length > 0 ? (
        <div className="rounded-lg border">
          <NotificationList
            notifications={notifications}
            activeNotificationId={activeNotificationId}
            onOpenNotification={openNotification}
          />
        </div>
      ) : null}
    </div>
  );
}
