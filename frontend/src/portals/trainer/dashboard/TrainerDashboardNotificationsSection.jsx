"use client";

import { memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";

import { resolveNotificationTarget } from "@/components/common/notificationTargets";
import { useNotifications } from "@/hooks/useNotifications";

import { formatTimeAgo, getBadgeClasses } from "./dashboardUtils";

const NotificationRowSkeleton = ({ index }) => (
  <div
    key={`trainer-dashboard-notification-row-${index}`}
    className="h-24 animate-pulse rounded-2xl bg-slate-100"
  />
);

function TrainerDashboardNotificationsSection({ currentUserRole }) {
  const router = useRouter();
  const {
    loading,
    notifications,
    unreadCount,
    markRead,
    markAllRead,
  } = useNotifications({
    limit: 5,
  });

  const handleNotificationClick = useCallback(
    (notification) => {
      if (!notification?.isRead) {
        markRead(notification._id);
      }

      const target = resolveNotificationTarget(notification, currentUserRole);
      if (target) {
        router.push(target);
      }
    },
    [currentUserRole, markRead, router],
  );

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm sm:rounded-[28px]">
      <div className="border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
              Notifications
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                : "You're all caught up"}
            </p>
          </div>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={markAllRead}
              className="hidden items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:border-emerald-200 hover:bg-emerald-50 sm:inline-flex"
            >
              <Check className="h-3.5 w-3.5" />
              Mark all read
            </button>
          ) : null}
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 sm:py-5">
        {loading ? (
          <div className="space-y-3 sm:space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <NotificationRowSkeleton key={index} index={index} />
            ))}
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            {notifications.map((notification) => (
              <button
                key={notification._id}
                type="button"
                onClick={() => handleNotificationClick(notification)}
                className={`flex w-full flex-col gap-2 rounded-2xl border px-4 py-4 text-left transition hover:border-slate-300 hover:bg-slate-50 md:flex-row md:items-center md:justify-between md:px-5 ${
                  !notification.isRead
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-slate-200"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    {!notification.isRead ? (
                      <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    ) : null}
                    <div className="min-w-0">
                      <h3
                        className={`truncate text-base sm:text-lg ${
                          !notification.isRead
                            ? "font-bold text-slate-900"
                            : "font-semibold text-slate-700"
                        }`}
                      >
                        {notification.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 pl-4 md:pl-0">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getBadgeClasses(notification.type)}`}
                  >
                    {notification.type || "System"}
                  </span>
                  <span className="whitespace-nowrap text-xs text-slate-400">
                    {formatTimeAgo(notification.createdAt)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center sm:px-6 sm:py-14">
            <Bell className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-4 text-lg font-semibold text-slate-700">All caught up</h3>
            <p className="mt-2 text-sm text-slate-500">
              New notifications about schedules, attendance, and announcements will
              appear here.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default memo(TrainerDashboardNotificationsSection);
