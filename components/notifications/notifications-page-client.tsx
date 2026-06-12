"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [filter, setFilter] = useState<"all" | "unread">("all");

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

  const markAsRead = useCallback(
    (notification: AppNotification) => {
      setActiveNotificationId(notification.id);

      void markNotificationReadAction(notification.id).then((result) => {
        setActiveNotificationId(null);

        if (!result.ok) {
          setMessage("Could not update notification.");
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
      });
    },
    [],
  );

  const filteredNotifications = useMemo(
    () =>
      filter === "unread"
        ? notifications.filter((n) => n.isUnread)
        : notifications,
    [notifications, filter],
  );

  return (
    <div className="theme-lendfolio relative isolate min-h-dvh overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(22,22,22,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(22,22,22,0.03)_1px,transparent_1px)] bg-[size:5rem_5rem]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(circle_at_50%_0%,rgba(51,66,60,0.12),transparent_64%)]" />

      <header className="sticky top-0 z-10 border-b border-border/80 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              aria-label="Go back"
              className="rounded-xl text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <ArrowLeft className="size-5" />
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-[0.12em] text-foreground uppercase">
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
              className="gap-1.5 rounded-xl border border-border/80 bg-card/80 text-accent-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <CheckCheck className="size-4" />
              <span className="hidden sm:inline">Mark all read</span>
              <span className="sm:hidden">Read all</span>
            </Button>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-6 sm:py-8">
        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card/90 shadow-[0_18px_50px_rgba(14,26,18,0.08)]">
          <div className="flex flex-col gap-4 border-b border-border/80 bg-card/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="grid gap-1">
              <p className="text-sm font-semibold text-foreground">
                Workflow updates
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                Review application, verification, offer, and repayment activity.
              </p>
            </div>
            <Tabs
              value={filter}
              onValueChange={(value) => setFilter(value as "all" | "unread")}
            >
              <TabsList className="h-10 rounded-xl border border-border/80 bg-muted/70 p-1 text-muted-foreground">
                <TabsTrigger
                  value="all"
                  className="rounded-lg px-4 data-active:bg-primary data-active:text-primary-foreground data-active:shadow-sm"
                >
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="unread"
                  className="rounded-lg px-4 data-active:bg-primary data-active:text-primary-foreground data-active:shadow-sm"
                >
                  Unread
                  {unreadCount > 0 ? (
                    <Badge
                      variant="secondary"
                      className="ml-1.5 min-w-5 justify-center rounded-full border border-border/80 bg-card px-1 py-0 text-[10px] leading-none text-foreground"
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  ) : null}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {message ? (
            <div className="px-4 py-4 sm:px-5">
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            </div>
          ) : null}

          {!message && isInitialLoad ? (
            <NotificationsSkeleton count={6} />
          ) : null}

          {!message && !isInitialLoad && filteredNotifications.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16">
              <div className="flex size-16 items-center justify-center rounded-2xl border border-border/80 bg-muted/70 text-accent-foreground shadow-[0_10px_30px_rgba(14,26,18,0.05)]">
                <Bell className="size-8" />
              </div>
              <div className="grid gap-1 text-center">
                <p className="text-sm font-medium text-foreground">
                  {filter === "unread"
                    ? "No unread notifications"
                    : "No notifications yet"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {filter === "unread"
                    ? "You're all caught up."
                    : "Workflow updates will appear here."}
                </p>
              </div>
            </div>
          ) : null}

          {!message && filteredNotifications.length > 0 ? (
            <NotificationList
              notifications={filteredNotifications}
              activeNotificationId={activeNotificationId}
              onRead={markAsRead}
            />
          ) : null}
        </section>

        <div className="h-24 sm:h-0" />
      </main>
    </div>
  );
}
