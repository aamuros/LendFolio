"use client";

import type { AppNotification } from "@/lib/notifications";
import { NotificationItem } from "./notification-item";

export function NotificationList({
  notifications,
  activeNotificationId,
  onOpenNotification,
}: {
  notifications: AppNotification[];
  activeNotificationId: string | null;
  onOpenNotification: (notification: AppNotification) => void;
}) {
  return (
    <ul className="divide-y divide-border" role="list">
      {notifications.map((notification) => (
        <li key={notification.id}>
          <NotificationItem
            notification={notification}
            isActive={activeNotificationId === notification.id}
            onOpen={onOpenNotification}
          />
        </li>
      ))}
    </ul>
  );
}
