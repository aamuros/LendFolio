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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, CheckCheck, Bell, AlertCircle } from "lucide-react";

export function NotificationsPageClient() {
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
        window.dispatchEvent(new CustomEvent("notifications-updated"));
        router.refresh();
      });
    });
  }, [router]);

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
        window.dispatchEvent(new CustomEvent("notifications-updated"));
        router.refresh();
      }

      setActiveNotificationId(null);

      if (notification.href) {
        router.push(notification.href);
      }
    },
    [router],
  );

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              aria-label="Go back"
              className="rounded-full text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-5" />
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-foreground">
                Notifications
              </h1>
              {unreadCount > 0 ? (
                <Badge
                  variant="default"
                  className="min-w-5 justify-center rounded-full px-1.5 py-0.5 text-[10px] leading-none"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              ) : null}
            </div>
          </div>
          {unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              disabled={isPending}
              className="gap-1.5 text-muted-foreground"
            >
              <CheckCheck className="size-4" />
              <span className="hidden sm:inline">Mark all read</span>
              <span className="sm:hidden">Read all</span>
            </Button>
          ) : null}
        </div>
      </header>

      <main className="flex-1">
        {message ? (
          <div className="px-4 py-4">
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          </div>
        ) : null}

        {!message && isInitialLoad ? (
          <NotificationsSkeleton count={6} />
        ) : null}

        {!message && !isInitialLoad && notifications.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted">
              <Bell className="size-8 text-muted-foreground/50" />
            </div>
            <div className="grid gap-1 text-center">
              <p className="text-sm font-medium text-foreground">
                No notifications yet
              </p>
              <p className="text-sm text-muted-foreground">
                Workflow updates will appear here.
              </p>
            </div>
          </div>
        ) : null}

        {!message && notifications.length > 0 ? (
          <div className="divide-y divide-border">
            <NotificationList
              notifications={notifications}
              activeNotificationId={activeNotificationId}
              onOpenNotification={openNotification}
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}
