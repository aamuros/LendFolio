"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  loadNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/notifications/actions";
import type { AppNotification } from "@/lib/notifications";
import { NotificationPanelContent } from "@/components/notifications/notification-panel-content";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell } from "lucide-react";

export function NotificationButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [message, setMessage] = useState("");
  const [activeNotificationId, setActiveNotificationId] = useState<
    string | null
  >(null);
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

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (open) {
        loadNotifications();
      }
    },
    [loadNotifications],
  );

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
      setIsOpen(false);

      if (notification.href) {
        router.push(notification.href);
      }
    },
    [router],
  );

  const bellIcon = (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Open notifications"
      aria-expanded={isOpen}
      className="relative rounded-full text-muted-foreground hover:text-foreground"
    >
      <Bell className="size-5" />
      {unreadCount > 0 ? (
        <Badge
          variant="default"
          className="absolute -top-1 -right-1 min-w-5 justify-center rounded-full px-1 py-0.5 text-[10px] leading-none"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </Badge>
      ) : null}
    </Button>
  );

  const panelContent = (
    <NotificationPanelContent
      notifications={notifications}
      unreadCount={unreadCount}
      message={message}
      isPending={isPending}
      activeNotificationId={activeNotificationId}
      onOpenNotification={openNotification}
      onMarkAllRead={markAllRead}
    />
  );

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{bellIcon}</PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        collisionPadding={16}
        className="z-50 w-[calc(100vw-2rem)] max-w-sm overflow-hidden p-0 sm:w-96"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {panelContent}
      </PopoverContent>
    </Popover>
  );
}
