"use client";

import type { AppNotification } from "@/lib/notifications";
import { NotificationItem } from "./notification-item";

export function NotificationList({
  notifications,
  activeNotificationId,
  onRead,
}: {
  notifications: AppNotification[];
  activeNotificationId: string | null;
  onRead: (notification: AppNotification) => void;
}) {
  return (
    <ul className="divide-y divide-border/80" role="list">
      {notifications.map((notification) => (
        <li key={notification.id}>
          <NotificationItem
            notification={notification}
            isActive={activeNotificationId === notification.id}
            onRead={onRead}
          />
        </li>
      ))}
    </ul>
  );
}
