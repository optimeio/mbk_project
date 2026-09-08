/**
 * Zustand Notification Store
 * Real-time notification state management with socket sync
 */

import { create } from "zustand";

const MAX_NOTIFICATIONS = 100;

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  lastFetched: null,

  // ── Setters ──────────────────────────────────────────────────────────────
  setNotifications: (notifications) =>
    set({
      notifications: notifications.slice(0, MAX_NOTIFICATIONS),
      unreadCount: notifications.filter((n) => !n.isRead).length,
      lastFetched: Date.now(),
    }),

  addNotification: (notification) =>
    set((state) => {
      const exists = state.notifications.some((n) => n._id === notification._id);
      if (exists) return state;
      const updated = [notification, ...state.notifications].slice(0, MAX_NOTIFICATIONS);
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.isRead).length,
      };
    }),

  markAsRead: (id) =>
    set((state) => {
      const updated = state.notifications.map((n) =>
        n._id === id ? { ...n, isRead: true } : n
      );
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.isRead).length,
      };
    }),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),

  removeNotification: (id) =>
    set((state) => {
      const updated = state.notifications.filter((n) => n._id !== id);
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.isRead).length,
      };
    }),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),
  setLoading: (isLoading) => set({ isLoading }),

  // ── Selectors ─────────────────────────────────────────────────────────────
  getUnread: () => get().notifications.filter((n) => !n.isRead),
  shouldRefetch: (maxAgeMs = 60000) => {
    const { lastFetched } = get();
    return !lastFetched || Date.now() - lastFetched > maxAgeMs;
  },
}));

export default useNotificationStore;
