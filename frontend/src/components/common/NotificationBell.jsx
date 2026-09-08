"use client";

import { useEffect, useState, memo } from "react";
import Bell from "lucide-react/dist/esm/icons/bell";
import Check from "lucide-react/dist/esm/icons/check";
import MonitorUp from "lucide-react/dist/esm/icons/monitor-up";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import { useRouter } from 'next/navigation';

import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { resolveNotificationTarget } from "@/components/common/notificationTargets";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const NotificationBell = ({ 
  iconClassName = "h-5 w-5 text-muted-foreground",
  badgeClassName = "absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground"
}) => {
  const { currentUser } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications({
    limit: 5,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [browserAlertsEnabled, setBrowserAlertsEnabled] = useState(() =>
    typeof window !== "undefined"
      ? window.localStorage.getItem("workspaceBrowserNotificationsEnabled") !== "false"
      : true,
  );
  const [browserPermission, setBrowserPermission] = useState(() =>
    typeof window !== "undefined" && "Notification" in window
      ? window.Notification.permission
      : "unsupported",
  );
  const router = useRouter();

  const browserNotificationsSupported =
    typeof window !== "undefined" && "Notification" in window;

  useEffect(() => {
    if (!browserNotificationsSupported) {
      setBrowserPermission("unsupported");
      return;
    }
    setBrowserPermission(window.Notification.permission);
  }, [browserNotificationsSupported]);

  useEffect(() => {
    const handleBrowserAlertPreference = (event) => {
      if (typeof event.detail?.enabled === "boolean") {
        setBrowserAlertsEnabled(event.detail.enabled);
      }
    };

    const handleStorage = (event) => {
      if (event.key === "workspaceBrowserNotificationsEnabled") {
        setBrowserAlertsEnabled(event.newValue !== "false");
      }
    };

    window.addEventListener("workspace-browser-alerts", handleBrowserAlertPreference);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("workspace-browser-alerts", handleBrowserAlertPreference);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const handleEnableBrowserAlerts = async (event) => {
    event.stopPropagation();
    if (!browserNotificationsSupported) return;

    const permission = await window.Notification.requestPermission();
    setBrowserPermission(permission);
    const enabled = permission === "granted";
    setBrowserAlertsEnabled(enabled);
    window.localStorage.setItem("workspaceBrowserNotificationsEnabled", String(enabled));
    window.dispatchEvent(
      new CustomEvent("workspace-browser-alerts", { detail: { enabled } }),
    );
  };

  const handleMarkAsRead = async (id, event) => {
    if (event) event.stopPropagation();
    await markRead(id);
  };

  const handleMarkAllRead = async (event) => {
    if (event) event.stopPropagation();
    await markAllRead();
  };

  const handleClearAll = async (event) => {
    if (event) event.stopPropagation();
    if (window.confirm("Are you sure you want to clear all notifications?")) {
      await clearAll();
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) markRead(notification._id);
    const targetLink = resolveNotificationTarget(notification, currentUser?.role);
    const normalizedType = String(notification?.type || "").toLowerCase();
    if (targetLink.startsWith("/chat")) {
      const nextTab = normalizedType === "announcement" ? "broadcasts" : "chats";
      window.localStorage.setItem("mbk_last_nav", nextTab);
      window.dispatchEvent(new CustomEvent("mbk_chat_nav_change", { detail: nextTab }));
    }
    if (targetLink) router.push(targetLink);
    setIsOpen(false);
  };

  const getBadgeVariant = (type) => {
    const t = (type || "").toLowerCase();
    if (t === "attendance") return "default";
    if (t === "salary") return "secondary";
    if (t === "schedule") return "outline";
    if (t === "complaints" || t === "complaint") return "destructive";
    if (t === "chat" || t === "announcement") return "default";
    return "secondary";
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full hover:bg-muted focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <Bell className={iconClassName} />
          {unreadCount > 0 ? (
            <span className={badgeClassName}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
          <span className="sr-only">Toggle notifications</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[380px] p-0" sideOffset={8}>
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <DropdownMenuLabel className="p-0 text-base font-semibold">
              Notifications
            </DropdownMenuLabel>
            <p className="text-xs text-muted-foreground">
              You have {unreadCount} unread messages
            </p>
          </div>
          {notifications.length > 0 ? (
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs font-medium text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                  onClick={handleMarkAllRead}
                >
                  <Check className="mr-1 h-3 w-3" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={handleClearAll}
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Clear all
              </Button>
            </div>
          ) : null}
        </div>

        {browserPermission !== "granted" || !browserAlertsEnabled ? (
          <div className="border-b bg-muted/40 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Browser alerts</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Enable browser notifications for new workspace messages and announcements.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleEnableBrowserAlerts}
                disabled={!browserNotificationsSupported || browserPermission === "denied"}
              >
                <MonitorUp className="mr-1 h-3.5 w-3.5" />
                {browserPermission === "denied"
                  ? "Blocked"
                  : browserAlertsEnabled
                    ? "Enabled"
                    : "Enable"}
              </Button>
            </div>
          </div>
        ) : null}

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex h-[200px] flex-col items-center justify-center text-muted-foreground">
              <Bell className="mb-2 h-8 w-8 opacity-20" />
              <p className="text-sm font-medium">All caught up</p>
              <p className="text-xs opacity-70">No new notifications</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`relative flex cursor-pointer items-start border-b p-4 transition-colors hover:bg-muted/50 ${
                    !notification.isRead ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex-1 space-y-1 pr-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium leading-none">
                        {notification.title}
                      </p>
                      <span className="ml-2 whitespace-nowrap text-[10px] text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {notification.message}
                    </p>
                    <div className="pt-2">
                      <Badge
                        variant={getBadgeVariant(notification.type)}
                        className="px-1.5 py-0 text-[10px]"
                      >
                        {notification.type || "System"}
                      </Badge>
                    </div>
                  </div>

                  {!notification.isRead ? (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default memo(NotificationBell);
