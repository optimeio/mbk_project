"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import {
  deleteAllNotifications,
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/services/notificationService";

const BROADCAST_ELIGIBLE_ROLES = new Set(["trainer", "spocadmin", "collegeadmin"]);
const NOTIFICATION_CACHE_TTL_MS = 60 * 1000;
const notificationCache = new Map();
const notificationRefreshInFlight = new Map();

const coerceScalarUserId = (value) => {
  if (value == null) return null;
  if (typeof value === "object") {
    return (
      coerceScalarUserId(value?.id) ||
      coerceScalarUserId(value?._id) ||
      coerceScalarUserId(value?.userId) ||
      coerceScalarUserId(value?.uid) ||
      null
    );
  }

  const normalized = String(value).trim();
  return normalized ? normalized : null;
};

const resolveUserId = (user) =>
  coerceScalarUserId(user?.authUserId) ||
  coerceScalarUserId(user?.userId) ||
  coerceScalarUserId(user?.id) ||
  coerceScalarUserId(user?._id) ||
  null;

const resolveRole = (user) => String(user?.role || "").trim().toLowerCase();
const getCacheKey = (userId, limit) => `${userId || "anonymous"}:${limit}`;
const getStorageKey = (cacheKey) => `mbk_notifications:${cacheKey}`;

const canUseBrowserStorage = () => typeof window !== "undefined";

const countUnreadNotifications = (items = []) =>
  items.reduce((count, item) => count + (item?.isRead ? 0 : 1), 0);

const normalizeNotificationPayload = (response = {}) => {
  const notifications = Array.isArray(response?.data) ? response.data : [];
  const unreadCount = Number(
    response?.unreadCount ?? countUnreadNotifications(notifications),
  );

  return { notifications, unreadCount };
};

const readCachedNotifications = (cacheKey) => {
  const now = Date.now();
  const inMemory = notificationCache.get(cacheKey);

  if (inMemory?.expiresAt > now) {
    return inMemory.payload;
  }

  if (!canUseBrowserStorage()) {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(getStorageKey(cacheKey));
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue);
    if (parsed?.expiresAt <= now || !parsed?.payload) {
      window.sessionStorage.removeItem(getStorageKey(cacheKey));
      return null;
    }

    notificationCache.set(cacheKey, parsed);
    return parsed.payload;
  } catch (error) {
    console.warn("Failed to read notification cache", error);
    return null;
  }
};

const writeCachedNotifications = (cacheKey, payload) => {
  const entry = {
    payload,
    expiresAt: Date.now() + NOTIFICATION_CACHE_TTL_MS,
  };

  notificationCache.set(cacheKey, entry);

  if (!canUseBrowserStorage()) {
    return;
  }

  try {
    window.sessionStorage.setItem(getStorageKey(cacheKey), JSON.stringify(entry));
  } catch (error) {
    console.warn("Failed to persist notification cache", error);
  }
};

const clearCachedNotifications = (cacheKey) => {
  notificationCache.delete(cacheKey);

  if (!canUseBrowserStorage()) {
    return;
  }

  try {
    window.sessionStorage.removeItem(getStorageKey(cacheKey));
  } catch (error) {
    console.warn("Failed to clear notification cache", error);
  }
};

const scheduleWhenIdle = (callback, delayMs = 0) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const runWhenVisible = () => {
    if (document.visibilityState !== "visible") {
      return;
    }

    callback();
  };

  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(runWhenVisible, {
      timeout: Math.max(800, delayMs || 0),
    });
    return () => window.cancelIdleCallback(handle);
  }

  const handle = window.setTimeout(runWhenVisible, delayMs);
  return () => window.clearTimeout(handle);
};

export function useNotifications({ limit = 20, enabled = true, deferMs = 0 } = {}) {
  const { currentUser } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const userId = useMemo(() => resolveUserId(currentUser), [currentUser]);
  const userRole = useMemo(() => resolveRole(currentUser), [currentUser]);
  const cacheKey = useMemo(() => getCacheKey(userId, limit), [userId, limit]);
  const lastBroadcastRefreshAtRef = useRef(0);
  const refreshInFlightRef = useRef(null);
  const queuedBroadcastRefreshRef = useRef(false);
  const broadcastRefreshTimerRef = useRef(null);

  const commitNotifications = useCallback(
    (nextNotifications = [], nextUnreadCount = countUnreadNotifications(nextNotifications)) => {
      const payload = {
        notifications: nextNotifications,
        unreadCount: nextUnreadCount,
      };

      setNotifications(nextNotifications);
      setUnreadCount(nextUnreadCount);
      writeCachedNotifications(cacheKey, payload);
      return payload;
    },
    [cacheKey],
  );

  const refresh = useCallback(
    async ({ skipLoading = false } = {}) => {
      if (refreshInFlightRef.current) {
        return refreshInFlightRef.current;
      }
      if (notificationRefreshInFlight.has(cacheKey)) {
        return notificationRefreshInFlight.get(cacheKey);
      }

      const refreshTask = (async () => {
      if (!userId) {
        clearCachedNotifications(cacheKey);
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return { notifications: [], unreadCount: 0 };
      }

      try {
        if (!skipLoading) {
          setLoading(true);
        }

        const response = await fetchNotifications(1, limit);
        if (response?.success && response?.data) {
          const next = normalizeNotificationPayload(response);
          commitNotifications(next.notifications, next.unreadCount);
          return next;
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      } finally {
        setLoading(false);
      }

      return null;
      })();

      refreshInFlightRef.current = refreshTask;
      notificationRefreshInFlight.set(cacheKey, refreshTask);
      try {
        return await refreshTask;
      } finally {
        refreshInFlightRef.current = null;
        if (notificationRefreshInFlight.get(cacheKey) === refreshTask) {
          notificationRefreshInFlight.delete(cacheKey);
        }
      }
    },
    [cacheKey, commitNotifications, limit, userId],
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    if (!userId) {
      clearCachedNotifications(cacheKey);
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return undefined;
    }

    const cached = readCachedNotifications(cacheKey);
    if (cached) {
      setNotifications(cached.notifications);
      setUnreadCount(cached.unreadCount);
      setLoading(false);
    }

    const cancelScheduledRefresh = scheduleWhenIdle(() => {
      refresh({ skipLoading: Boolean(cached) });
    }, deferMs);

    return cancelScheduledRefresh;
  }, [cacheKey, deferMs, enabled, refresh, userId]);

  useEffect(() => {
    if (!socket || !userId) {
      return undefined;
    }

    const event = `notification_${userId}`;
    const broadcastEvent = "receive_message";
    const scheduleBroadcastRefresh = (delayMs = 350) => {
      if (broadcastRefreshTimerRef.current) {
        return;
      }

      broadcastRefreshTimerRef.current = window.setTimeout(() => {
        broadcastRefreshTimerRef.current = null;
        if (!queuedBroadcastRefreshRef.current) {
          return;
        }

        const elapsedMs =
          Date.now() - Number(lastBroadcastRefreshAtRef.current || 0);
        if (elapsedMs < 1500) {
          scheduleBroadcastRefresh(Math.max(200, 1500 - elapsedMs));
          return;
        }

        queuedBroadcastRefreshRef.current = false;
        lastBroadcastRefreshAtRef.current = Date.now();
        refresh({ skipLoading: true }).finally(() => {
          if (queuedBroadcastRefreshRef.current) {
            scheduleBroadcastRefresh(350);
          }
        });
      }, delayMs);
    };

    const handleDirectNotification = (newNotification) => {
      setNotifications((prev) => {
        const nextNotifications = [newNotification, ...prev];
        const nextUnreadCount = countUnreadNotifications(nextNotifications);
        setUnreadCount(nextUnreadCount);
        writeCachedNotifications(cacheKey, {
          notifications: nextNotifications,
          unreadCount: nextUnreadCount,
        });
        return nextNotifications;
      });
    };

    const handleBroadcastNotification = (payload = {}) => {
      if (payload?.kind !== "admin_broadcast") return;
      if (!BROADCAST_ELIGIBLE_ROLES.has(userRole)) return;

      const targetRoles = Array.isArray(payload?.targetRoles)
        ? payload.targetRoles.map((role) => String(role || "").trim().toLowerCase())
        : [];
      if (targetRoles.length > 0 && !targetRoles.includes(userRole)) return;

      const message = String(payload?.message || payload?.text || "").trim();
      if (!message) return;

      queuedBroadcastRefreshRef.current = true;
      scheduleBroadcastRefresh(350);
    };

    socket.on(event, handleDirectNotification);
    socket.on(broadcastEvent, handleBroadcastNotification);

    return () => {
      socket.off(event, handleDirectNotification);
      socket.off(broadcastEvent, handleBroadcastNotification);
      if (broadcastRefreshTimerRef.current) {
        window.clearTimeout(broadcastRefreshTimerRef.current);
        broadcastRefreshTimerRef.current = null;
      }
      queuedBroadcastRefreshRef.current = false;
    };
  }, [cacheKey, refresh, socket, userId, userRole]);

  const markRead = useCallback(
    async (id) => {
      try {
        await markNotificationAsRead(id);
        setNotifications((prev) => {
          const nextNotifications = prev.map((item) =>
            item._id === id ? { ...item, isRead: true } : item,
          );
          const nextUnreadCount = countUnreadNotifications(nextNotifications);
          setUnreadCount(nextUnreadCount);
          writeCachedNotifications(cacheKey, {
            notifications: nextNotifications,
            unreadCount: nextUnreadCount,
          });
          return nextNotifications;
        });
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    },
    [cacheKey],
  );

  const markAllRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => {
        const nextNotifications = prev.map((item) => ({ ...item, isRead: true }));
        writeCachedNotifications(cacheKey, {
          notifications: nextNotifications,
          unreadCount: 0,
        });
        return nextNotifications;
      });
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }, [cacheKey]);

  const clearAll = useCallback(async () => {
    try {
      await deleteAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
      clearCachedNotifications(cacheKey);
    } catch (error) {
      console.error("Error clearing all notifications:", error);
    }
  }, [cacheKey]);

  return {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    clearAll,
    refresh,
    loading,
  };
}

export default useNotifications;
