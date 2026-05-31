"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { getUnreadNotificationsCountAction } from "@/app/notifications/actions";
import { SidebarMenuBadge } from "@/components/ui/sidebar";

export function NotificationUnreadBadge() {
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
    window.addEventListener("notifications-updated", handleNotificationsUpdated);
    return () =>
      window.removeEventListener("notifications-updated", handleNotificationsUpdated);
  }, [loadCount]);

  if (unreadCount <= 0) {
    return null;
  }

  return (
    <SidebarMenuBadge>
      {unreadCount > 9 ? "9+" : unreadCount}
    </SidebarMenuBadge>
  );
}
