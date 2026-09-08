"use client";

import { usePathname, useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import useDebouncedNavigate from "@/hooks/useDebouncedNavigate";
import SidebarHeader from "@/components/common/sidebar/SidebarHeader";
import SidebarNav from "@/components/common/sidebar/SidebarNav";
import SidebarRail from "@/components/common/sidebar/SidebarRail";
import {
  complaintsLinksByRole,
  homeLinksByRole,
  resolveNavLinks,
  resolvePortalTitle,
  resolveSidebarRole,
} from "@/components/common/sidebar/sidebarConfig";
import { prefetchPortalRoutes } from "@/utils/portalPrefetch";

function AppSidebar({ compact = false, isOpen = false, onClose = () => {} }) {
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current - touchEndX.current > 60) {
      onClose();
    }
  };

  const pathname = usePathname() || "";
  const router = useRouter();
  const debouncedNavigate = useDebouncedNavigate();
  const { currentUser, logout } = useAuth();
  const [chatTab, setChatTab] = useState("chats");

  const user = currentUser || {};

  const activeRole = useMemo(
    () => resolveSidebarRole(user.role, pathname),
    [pathname, user.role],
  );
  const isChatActive = pathname.startsWith("/chat") && activeRole !== "Trainer";

  const navLinks = useMemo(
    () => resolveNavLinks({ activeRole, isChatActive }),
    [activeRole, isChatActive],
  );

  useEffect(() => {
    if (!isChatActive) return undefined;

    const allowedTabs = ["chats", "groups", "broadcasts"];
    const syncFromStorage = () => {
      const next = localStorage.getItem("mbk_last_nav");
      if (next && allowedTabs.includes(next)) {
        setChatTab(next);
      }
    };

    const handleNavChange = (event) => {
      const next = event?.detail;
      if (next && allowedTabs.includes(next)) {
        setChatTab(next);
      }
    };

    syncFromStorage();
    window.addEventListener("mbk_chat_nav_change", handleNavChange);
    return () => window.removeEventListener("mbk_chat_nav_change", handleNavChange);
  }, [isChatActive]);

  const homeHref = useMemo(
    () => homeLinksByRole[activeRole] || "/dashboard",
    [activeRole],
  );

  const complaintsHref = useMemo(
    () => complaintsLinksByRole[activeRole] || null,
    [activeRole],
  );

  const isHomeActive = useMemo(() => pathname === homeHref, [homeHref, pathname]);

  const isComplaintsActive = useMemo(() => {
    if (!complaintsHref) return false;
    return pathname === complaintsHref || pathname.startsWith(`${complaintsHref}/`);
  }, [complaintsHref, pathname]);

  const portalTitle = useMemo(
    () => resolvePortalTitle(activeRole, isChatActive),
    [activeRole, isChatActive],
  );

  useEffect(() => {
    if (!currentUser?.role) return undefined;

    if (typeof window === "undefined") {
      return undefined;
    }

    const connection = navigator.connection;
    const prefersDataSaver = Boolean(connection?.saveData);
    const effectiveType = String(connection?.effectiveType || "").toLowerCase();
    const isSlowConnection = effectiveType.includes("2g");
    const isLowMemoryDevice = Number(navigator.deviceMemory || 8) <= 2;

    if (prefersDataSaver || isSlowConnection || isLowMemoryDevice) {
      return undefined;
    }

    let cleanup = () => {};
    let cancelled = false;
    const startPrefetch = () => {
      if (cancelled) return;
      cleanup = prefetchPortalRoutes(router, currentUser.role, currentUser.email, {
        exclude: [pathname],
        maxRoutes: 8,
      });
    };

    // Warm sibling routes right after first paint; waiting seconds means the
    // user's first click misses the prefetch cache entirely.
    const timerId = window.setTimeout(() => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(startPrefetch, { timeout: 300 });
      } else {
        startPrefetch();
      }
    }, 100);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
      cleanup();
    };
  }, [currentUser?.role, currentUser?.email, pathname, router]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      debouncedNavigate("/");
    }
  }, [debouncedNavigate, logout]);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[45] bg-black/40 backdrop-blur-xs transition-opacity md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        data-app-sidebar="true"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`${
          isOpen
            ? "fixed inset-y-0 left-0 z-50 flex w-80 max-w-[85vw] bg-[#1d5f87] shadow-2xl animate-in slide-in-from-left duration-200"
            : "hidden md:flex"
        } md:fixed md:inset-y-3 md:left-3 md:z-50 md:overflow-hidden md:rounded-2xl md:border md:border-[#2b6d93] text-white md:shadow-[0_18px_42px_rgba(11,43,65,0.35)] ${
          compact ? "md:w-12 bg-[#1a567b]" : "md:w-80 bg-[#1d5f87]"
        }`}
      >
      <SidebarRail
        compact={compact}
        complaintsHref={complaintsHref}
        handleLogout={handleLogout}
        homeHref={homeHref}
        isChatActive={isChatActive}
        isComplaintsActive={isComplaintsActive}
        isHomeActive={isHomeActive}
      />

      {!compact ? (
        <div className="flex min-w-0 flex-1 flex-col">
          <SidebarHeader portalTitle={portalTitle} />
          <SidebarNav
            chatTab={chatTab}
            isChatActive={isChatActive}
            navLinks={navLinks}
            pathname={pathname}
            setChatTab={setChatTab}
          />
        </div>
      ) : null}
      </aside>
    </>
  );
}
export default memo(AppSidebar);
