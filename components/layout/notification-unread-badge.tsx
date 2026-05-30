"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { getUnreadNotificationsCountAction } from "@/app/notifications/actions";
import { SidebarMenuBadge } from "@/components/ui/sidebar";

export function NotificationUnreadBadge() {
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
