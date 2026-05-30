"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bell,
  CheckCheck,
  BellOff,
  ChevronRight,
  Circle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const notificationTypeLabels: Record<string, string> = {
  offer_received: "Offer",
  offer_accepted: "Accepted",
  offer_declined: "Declined",
  repayment_proof_submitted: "Proof",
  repayment_verified: "Verified",
  repayment_rejected: "Rejected",
  repayment_late: "Late",
  loan_overdue: "Overdue",
};

const notificationTypeTones: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  offer_received: "default",
  offer_accepted: "secondary",
  offer_declined: "destructive",
  repayment_proof_submitted: "secondary",
  repayment_verified: "secondary",
  repayment_rejected: "destructive",
  repayment_late: "destructive",
  loan_overdue: "destructive",
};

function NotificationTypeBadge({ type }: { type: string }) {
  const label = notificationTypeLabels[type];
  if (!label) return null;

  return (
    <Badge
      variant={notificationTypeTones[type] ?? "outline"}
      className="text-[10px] font-semibold"
    >
      {label}
    </Badge>
  );
}

function NotificationList({
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
          <button
            type="button"
            onClick={() => void onOpenNotification(notification)}
            disabled={activeNotificationId === notification.id}
            className={cn(
              "group grid w-full grid-cols-[auto_1fr_auto] items-start gap-3 px-4 py-3 text-left transition",
              "hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-ring disabled:opacity-70",
              notification.isUnread && "bg-primary/[0.03]",
            )}
          >
            <span className="mt-1 flex shrink-0 items-center">
              {activeNotificationId === notification.id ? (
                <Loader2 className="size-2.5 animate-spin text-muted-foreground" />
              ) : (
                <Circle
                  aria-hidden="true"
                  className={cn(
                    "size-2.5",
                    notification.isUnread
                      ? "fill-primary text-primary"
                      : "fill-border text-border",
                  )}
                />
              )}
            </span>
            <span className="grid min-w-0 gap-1">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground">
                  {notification.title}
                </span>
                <NotificationTypeBadge type={notification.type} />
              </span>
              <span className="text-sm leading-5 text-muted-foreground line-clamp-2">
                {notification.message}
              </span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {formatNotificationDate(notification.createdAt)}
                {notification.isUnread ? (
                  <span className="font-semibold text-primary">Unread</span>
                ) : null}
              </span>
            </span>
            {notification.href ? (
              <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" />
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <BellOff className="size-8 text-muted-foreground/50" />
      <p className="text-sm font-medium text-muted-foreground">
        No notifications yet
      </p>
      <p className="text-xs text-muted-foreground/70">
        Workflow updates will appear here.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-10">
      <Loader2 className="size-4 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Loading notifications.</p>
    </div>
  );
}

function NotificationPanelContent({
  notifications,
  unreadCount,
  message,
  isPending,
  activeNotificationId,
  onOpenNotification,
  onMarkAllRead,
}: {
  notifications: AppNotification[];
  unreadCount: number;
  message: string;
  isPending: boolean;
  activeNotificationId: string | null;
  onOpenNotification: (notification: AppNotification) => void;
  onMarkAllRead: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="grid gap-0.5">
          <h2 className="text-sm font-semibold">Notifications</h2>
          {unreadCount > 0 ? (
            <p className="text-xs text-muted-foreground">
              {unreadCount} unread
            </p>
          ) : null}
        </div>
        {unreadCount > 0 ? (
          <Button
            variant="ghost"
            size="xs"
            onClick={onMarkAllRead}
            disabled={isPending}
            className="gap-1 text-muted-foreground"
          >
            <CheckCheck className="size-3.5" />
            Mark all read
          </Button>
        ) : null}
      </div>
      <Separator />

      {message ? (
        <div className="px-4 py-3">
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        </div>
      ) : null}

      {!message && isPending && notifications.length === 0 ? (
        <LoadingState />
      ) : null}

      {!message && !isPending && notifications.length === 0 ? (
        <EmptyState />
      ) : null}

      {!message && notifications.length > 0 ? (
        <ScrollArea className="max-h-[min(60svh,24rem)]">
          <NotificationList
            notifications={notifications}
            activeNotificationId={activeNotificationId}
            onOpenNotification={onOpenNotification}
          />
        </ScrollArea>
      ) : null}
    </>
  );
}

export function NotificationButton() {
  const router = useRouter();
  const isMobile = useIsMobile();
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
      });
    });
  }, []);

  const openNotification = useCallback(
    async (notification: AppNotification) => {
      setActiveNotificationId(notification.id);

      if (!notification.readAt) {
        const result = await markNotificationReadAction(notification.id);

        if (!result.ok) {
          setMessage("Could not update notifications.");
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
    },
    [router],
  );

  const bellButton = (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
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
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Notifications</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>{bellButton}</SheetTrigger>
        <SheetContent side="bottom" className="h-[80svh] gap-0 p-0" showCloseButton>
          <SheetHeader className="sr-only">
            <SheetTitle>Notifications</SheetTitle>
            <SheetDescription>View and manage your notifications</SheetDescription>
          </SheetHeader>
          <NotificationPanelContent
            notifications={notifications}
            unreadCount={unreadCount}
            message={message}
            isPending={isPending}
            activeNotificationId={activeNotificationId}
            onOpenNotification={openNotification}
            onMarkAllRead={markAllRead}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{bellButton}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-96 p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <NotificationPanelContent
          notifications={notifications}
          unreadCount={unreadCount}
          message={message}
          isPending={isPending}
          activeNotificationId={activeNotificationId}
          onOpenNotification={openNotification}
          onMarkAllRead={markAllRead}
        />
      </PopoverContent>
    </Popover>
  );
}
