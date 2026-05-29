"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  loadNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/notifications/actions";
import {
  formatNotificationDate,
  type AppNotification,
} from "@/lib/notifications";

export function NotificationButton() {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [message, setMessage] = useState("");
  const [activeNotificationId, setActiveNotificationId] = useState<string | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const loadNotifications = useCallback(() => {
    startTransition(() => {
      void loadNotificationsAction().then((result) => {
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

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        panelRef.current &&
        event.target instanceof Node &&
        !panelRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  const openPanel = useCallback(() => {
    setIsOpen((current) => !current);
    loadNotifications();
  }, [loadNotifications]);

  const markAllRead = useCallback(() => {
    startTransition(() => {
      void markAllNotificationsReadAction().then((result) => {
        if (!result.ok) {
          setMessage("Could not load notifications.");
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

  const openNotification = useCallback(async (notification: AppNotification) => {
    setActiveNotificationId(notification.id);

    if (!notification.readAt) {
      const result = await markNotificationReadAction(notification.id);

      if (!result.ok) {
        setMessage("Could not load notifications.");
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
    setIsOpen(false);

    if (notification.href) {
      router.push(notification.href);
    }
  }, [router]);

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        aria-label="Open notifications"
        aria-expanded={isOpen}
        onClick={openPanel}
        className="relative inline-flex size-10 items-center justify-center rounded-full bg-background text-foreground ring-1 ring-foreground/10 transition hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        >
          <path d="M10.27 21a2 2 0 0 0 3.46 0" />
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-5 rounded-full bg-primary px-1.5 py-0.5 text-center text-[10px] leading-none font-semibold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <section
          aria-label="Notifications"
          className="fixed inset-x-4 top-16 z-40 mx-auto grid max-h-[75svh] max-w-md overflow-hidden rounded-2xl bg-popover text-popover-foreground ring-1 ring-foreground/10 shadow-xl sm:absolute sm:inset-x-auto sm:top-12 sm:right-0 sm:w-96"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="grid gap-0.5">
              <h2 className="text-sm font-semibold">Notifications</h2>
              {unreadCount > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {unreadCount} unread
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={isPending}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-border px-3 text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Mark all as read
                </button>
              ) : null}
              <button
                type="button"
                aria-label="Close notifications"
                onClick={() => setIsOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="max-h-[62svh] overflow-y-auto">
            {message ? (
              <p className="px-4 py-6 text-sm text-muted-foreground" role="alert">
                {message}
              </p>
            ) : null}

            {!message && notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                {isPending ? "Loading notifications." : "No notifications yet."}
              </p>
            ) : null}

            {!message && notifications.length > 0 ? (
              <ul className="divide-y divide-border">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => void openNotification(notification)}
                      disabled={activeNotificationId === notification.id}
                      className="grid w-full grid-cols-[auto_1fr] gap-3 px-4 py-4 text-left transition hover:bg-muted/50 disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-ring"
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-1.5 size-2.5 rounded-full ${
                          notification.isUnread
                            ? "bg-primary"
                            : "bg-border"
                        }`}
                      />
                      <span className="grid gap-1">
                        <span className="flex flex-wrap items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {notification.title}
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground">
                            {formatNotificationDate(notification.createdAt)}
                          </span>
                        </span>
                        <span className="text-sm leading-6 text-muted-foreground">
                          {notification.message}
                        </span>
                        {notification.isUnread ? (
                          <span className="text-xs font-semibold text-foreground">
                            Unread
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
