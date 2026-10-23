import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bell, MessageCircle, Package, Truck, UserPlus, Tag as TagIcon } from "lucide-react";
import { notificationApi } from "@/lib/endpoints";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

const POLL_INTERVAL_MS = 30_000;

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const loadedOnce = useRef(false);

  const loadUnreadCount = async () => {
    try {
      const response = (await notificationApi.unreadCount()) as any;
      setUnreadCount(Number(response?.data?.count ?? 0));
    } catch {
      // Ignore transient polling failures.
    }
  };

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = (await notificationApi.list({ limit: 20 })) as any;
      const items = response?.data?.items ?? [];
      setNotifications(items);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUnreadCount();
    const interval = window.setInterval(loadUnreadCount, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (open && !loadedOnce.current) {
      loadedOnce.current = true;
      void loadNotifications();
    }
  }, [open]);

  const openNotification = async (notification: Notification) => {
    if (!notification.isRead) {
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
      notificationApi.markRead(notification.id).catch(() => {});
    }
    setOpen(false);
    navigate(destinationFor(notification.type) as any);
  };

  const markAllRead = async () => {
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    try {
      await notificationApi.markAllRead();
    } catch {
      void loadNotifications();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-secondary"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-black leading-none text-destructive-foreground ring-2 ring-background">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-display text-sm font-bold">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Loading…</p>
          ) : notifications.length ? (
            notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => openNotification(notification)}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left text-sm transition last:border-b-0 hover:bg-secondary",
                  !notification.isRead && "bg-primary/5",
                )}
              >
                <span className="mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <NotificationIcon type={notification.type} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block", !notification.isRead && "font-semibold")}>
                    {notification.content}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {formatRelativeTime(notification.createdAt)}
                  </span>
                </span>
                {!notification.isRead && (
                  <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                )}
              </button>
            ))
          ) : (
            <p className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case "NEW_MESSAGE":
      return <MessageCircle className="h-4 w-4" />;
    case "PRODUCT_SOLD":
      return <TagIcon className="h-4 w-4" />;
    case "ORDER_STATUS":
      return <Truck className="h-4 w-4" />;
    case "NEW_FOLLOWER":
      return <UserPlus className="h-4 w-4" />;
    default:
      return <Package className="h-4 w-4" />;
  }
}

function destinationFor(type: string) {
  switch (type) {
    case "NEW_MESSAGE":
      return { to: "/messages" };
    case "PRODUCT_SOLD":
      return { to: "/account", search: { tab: "seller" } };
    case "ORDER_STATUS":
      return { to: "/account", search: { tab: "orders" } };
    default:
      return { to: "/account" };
  }
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}
