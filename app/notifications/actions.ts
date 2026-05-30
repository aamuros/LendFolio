"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  mapNotificationRows,
  normalizeNotificationHref,
  type AppNotification,
} from "@/lib/notifications";

const notificationSelect =
  "id, user_id, type, title, message, href, read_at, created_at";
const notificationLimit = 20;
const notificationIdSchema = z.string().uuid();

type AuthenticatedNotificationClient =
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
      userId: string;
    }
  | {
      ok: false;
      message: string;
    };

export type LoadNotificationsResult =
  | {
      ok: true;
      notifications: AppNotification[];
      unreadCount: number;
    }
  | {
      ok: false;
      notifications: [];
      unreadCount: 0;
      message: string;
    };

export type NotificationMutationResult =
  | {
      ok: true;
      readAt: string;
      href?: string | null;
    }
  | {
      ok: false;
      message: string;
    };

export async function loadNotificationsAction(): Promise<LoadNotificationsResult> {
  const access = await getAuthenticatedNotificationClient();

  if (!access.ok) {
    return {
      ok: false,
      notifications: [],
      unreadCount: 0,
      message: access.message,
    };
  }

  const [notificationsResult, unreadCountResult] = await Promise.all([
    access.supabase
      .from("notifications")
      .select(notificationSelect)
      .eq("user_id", access.userId)
      .order("created_at", { ascending: false })
      .limit(notificationLimit),
    access.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", access.userId)
      .is("read_at", null),
  ]);

  if (notificationsResult.error || unreadCountResult.error) {
    return {
      ok: false,
      notifications: [],
      unreadCount: 0,
      message: "Could not load notifications.",
    };
  }

  return {
    ok: true,
    notifications: mapNotificationRows(notificationsResult.data ?? []),
    unreadCount: unreadCountResult.count ?? 0,
  };
}

export async function getUnreadNotificationsCountAction() {
  const access = await getAuthenticatedNotificationClient();

  if (!access.ok) {
    return {
      ok: false as const,
      unreadCount: 0,
      message: access.message,
    };
  }

  const { count, error } = await access.supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", access.userId)
    .is("read_at", null);

  if (error) {
    return {
      ok: false as const,
      unreadCount: 0,
      message: "Could not load notifications.",
    };
  }

  return {
    ok: true as const,
    unreadCount: count ?? 0,
  };
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<NotificationMutationResult> {
  const parsed = notificationIdSchema.safeParse(notificationId);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Notification unavailable.",
    };
  }

  const access = await getAuthenticatedNotificationClient();

  if (!access.ok) {
    return {
      ok: false,
      message: access.message,
    };
  }

  const readAt = new Date().toISOString();
  const { data, error } = await access.supabase
    .from("notifications")
    .update({ read_at: readAt })
    .eq("id", parsed.data)
    .eq("user_id", access.userId)
    .select("id, href, read_at")
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      message: "Could not update notifications.",
    };
  }

  return {
    ok: true,
    readAt: data.read_at ?? readAt,
    href: normalizeNotificationHref(data.href),
  };
}

export async function markAllNotificationsReadAction(): Promise<NotificationMutationResult> {
  const access = await getAuthenticatedNotificationClient();

  if (!access.ok) {
    return {
      ok: false,
      message: access.message,
    };
  }

  const readAt = new Date().toISOString();
  const { error } = await access.supabase
    .from("notifications")
    .update({ read_at: readAt })
    .eq("user_id", access.userId)
    .is("read_at", null);

  if (error) {
    return {
      ok: false,
      message: "Could not update notifications.",
    };
  }

  return {
    ok: true,
    readAt,
  };
}

async function getAuthenticatedNotificationClient(): Promise<AuthenticatedNotificationClient> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      message: "Sign in to view notifications.",
    };
  }

  return {
    ok: true,
    supabase,
    userId: user.id,
  };
}
