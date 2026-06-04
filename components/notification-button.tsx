"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getUnreadNotificationsCountAction,
  loadNotificationsAction,
  markNotificationReadAction,
} from "@/app/notifications/actions";
import type { AppNotification } from "@/lib/notifications";
import { formatNotificationDate } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function NotificationButton() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [, startTransition] = useTransition();

  const loadCount = useCallback(() => {
    startTransition(() => {
      void getUnreadNotificationsCountAction().then((result) => {
        if (result.ok) {
          setUnreadCount(result.unreadCount);
        }
      });
    });
  }, []);

  useEffect(() => {
    loadCount();
  }, [loadCount, pathname]);

  useEffect(() => {
    const handleNotificationsUpdated = () => loadCount();
    window.addEventListener(
      "notifications-updated",
      handleNotificationsUpdated,
    );
    return () =>
      window.removeEventListener(
        "notifications-updated",
        handleNotificationsUpdated,
      );
  }, [loadCount]);

  const loadNotifications = useCallback(() => {
    setIsLoading(true);
    void loadNotificationsAction().then((result) => {
      setIsLoading(false);
      if (result.ok) {
        setNotifications(result.notifications);
        setUnreadCount(result.unreadCount);
      }
    });
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen && notifications.length === 0) {
        loadNotifications();
      }
    },
    [notifications.length, loadNotifications],
  );

  const handleNotificationClick = useCallback(
    (notification: AppNotification) => {
      if (notification.isUnread) {
        void markNotificationReadAction(notification.id).then((result) => {
          if (result.ok) {
            setUnreadCount((current) => Math.max(0, current - 1));
            setNotifications((current) =>
              current.map((item) =>
                item.id === notification.id
                  ? { ...item, readAt: result.readAt, isUnread: false }
                  : item,
              ),
            );
            window.dispatchEvent(new CustomEvent("notifications-updated"));
          }
        });
      }
      setOpen(false);
    },
    [],
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open notifications"
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
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold text-foreground">
            Notifications
          </span>
          {unreadCount > 0 ? (
            <Badge
              variant="default"
              className="min-w-5 justify-center rounded-full px-1.5 py-0.5 text-[10px] leading-none"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          ) : null}
        </div>
        <Separator />
        <ScrollArea className="max-h-80">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            <ul role="list">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <a
                    href={notification.href ?? "#"}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 transition hover:bg-muted/50",
                      notification.isUnread && "bg-primary/[0.03]",
                    )}
                  >
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "truncate text-sm",
                            notification.isUnread
                              ? "font-semibold text-foreground"
                              : "font-medium text-foreground/80",
                          )}
                        >
                          {notification.title}
                        </span>
                        {notification.isUnread ? (
                          <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                        ) : null}
                      </span>
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {notification.message}
                      </span>
                      <span className="text-xs text-muted-foreground/70">
                        {formatNotificationDate(notification.createdAt)}
                      </span>
                    </span>
                    {notification.href ? (
                      <ChevronRight className="mt-1 size-3.5 shrink-0 text-muted-foreground/50" />
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
        <Separator />
        <div className="px-4 py-2">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block text-center text-sm font-medium text-primary hover:underline"
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
