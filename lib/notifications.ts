import type { Database } from "@/lib/supabase/types";

export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
  isUnread: boolean;
};

export function mapNotificationRow(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    href: normalizeNotificationHref(row.href),
    readAt: row.read_at,
    createdAt: row.created_at,
    isUnread: row.read_at === null,
  };
}

export function mapNotificationRows(rows: NotificationRow[]): AppNotification[] {
  return rows.map(mapNotificationRow);
}

export function countUnreadNotifications(
  notifications: Pick<AppNotification, "readAt">[],
) {
  return notifications.filter((notification) => notification.readAt === null).length;
}

export function normalizeNotificationHref(href: string | null) {
  if (!href || !href.startsWith("/")) {
    return null;
  }

  return href;
}

export function formatNotificationDate(value: string, now = new Date()) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  ) {
    return new Intl.DateTimeFormat("en-PH", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(date);
}
