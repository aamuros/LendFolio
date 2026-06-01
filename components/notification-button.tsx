"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getUnreadNotificationsCountAction } from "@/app/notifications/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";

export function NotificationButton() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
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

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Open notifications"
      className="relative rounded-full text-muted-foreground hover:text-foreground"
      asChild
    >
      <Link href="/notifications">
        <Bell className="size-5" />
        {unreadCount > 0 ? (
          <Badge
            variant="default"
            className="absolute -top-1 -right-1 min-w-5 justify-center rounded-full px-1 py-0.5 text-[10px] leading-none"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        ) : null}
      </Link>
    </Button>
  );
}
