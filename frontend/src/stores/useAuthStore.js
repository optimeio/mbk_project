/**
 * Zustand Auth Store
 * Persistent auth state with localStorage sync + token management
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set, get) => ({
      // ── State ────────────────────────────────────────────────────────────
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      lastActivity: null,

      // ── Actions ─────────────────────────────────────────────────────────
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          lastActivity: Date.now(),
        }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      login: (user, accessToken, refreshToken) =>
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
          lastActivity: Date.now(),
        }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          lastActivity: null,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      refreshActivity: () => set({ lastActivity: Date.now() }),

      // ── Selectors ────────────────────────────────────────────────────────
      getRole: () => get().user?.role || null,
      getUserId: () => get().user?.id || get().user?._id || null,
      isRole: (role) => {
        const userRole = get().user?.role || "";
        if (Array.isArray(role)) return role.some((r) => r.toLowerCase() === userRole.toLowerCase());
        return userRole.toLowerCase() === role.toLowerCase();
      },
      isSessionExpired: (maxIdleMs = 30 * 60 * 1000) => {
        const { lastActivity, isAuthenticated } = get();
        if (!isAuthenticated || !lastActivity) return false;
        return Date.now() - lastActivity > maxIdleMs;
      },
    }),
    {
      name: "mbk-auth",
      storage: createJSONStorage(() => {
        // Use sessionStorage for more secure token storage (clears on tab close)
        if (typeof window !== "undefined") return window.sessionStorage;
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      // Only persist non-sensitive fields
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        lastActivity: state.lastActivity,
      }),
    }
  )
);

export default useAuthStore;
