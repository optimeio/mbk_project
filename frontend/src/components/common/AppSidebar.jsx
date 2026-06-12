"use client";

import { usePathname, useRouter } from "next/navigation";
import { memo, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import SidebarFooter from "@/components/common/sidebar/SidebarFooter";
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
  const { currentUser, logout } = useAuth();
  const [chatTab, setChatTab] = useState("chats");
  const [hasHydrated, setHasHydrated] = useState(false);
  const prefetchedKeyRef = useRef("");

  const user = currentUser || {};
  const isChatActive = pathname.startsWith("/chat");

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const activeRole = useMemo(
    () => resolveSidebarRole(user.role, pathname),
    [pathname, user.role],
  );

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

  const userInitial = hasHydrated
    ? (user.name || user.displayName || user.email || "U").charAt(0).toUpperCase()
    : "U";

  useEffect(() => {
    if (!currentUser?.role) return undefined;

    const prefetchKey = `${String(currentUser.role || "").trim().toLowerCase()}::${String(currentUser.email || "").trim().toLowerCase()}`;
    if (prefetchedKeyRef.current === prefetchKey) {
      return undefined;
    }

    prefetchedKeyRef.current = prefetchKey;
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
      });
    };

    const timerId = window.setTimeout(() => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(startPrefetch, { timeout: 1800 });
      } else {
        startPrefetch();
      }
    }, 1200);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
      cleanup();
    };
  }, [currentUser?.role, currentUser?.email, pathname, router]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      router.push("/");
    }
  };

  const handleNavigate = (href) => {
    router.push(href);
  };

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
        className={`fixed inset-y-3 left-3 z-50 overflow-hidden rounded-2xl border border-[#2b6d93] text-white shadow-[0_18px_42px_rgba(11,43,65,0.35)] flex transition-transform duration-300 ${
          compact ? "w-12 bg-[#1a567b]" : "w-80 bg-[#1d5f87]"
        } ${
          isOpen ? "translate-x-0" : "-translate-x-[calc(100%+24px)]"
        } md:translate-x-0`}
      >
      <SidebarRail
        compact={compact}
        complaintsHref={complaintsHref}
        handleLogout={handleLogout}
        homeHref={homeHref}
        isChatActive={isChatActive}
        isComplaintsActive={isComplaintsActive}
        isHomeActive={isHomeActive}
        onNavigate={handleNavigate}
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
          <SidebarFooter handleLogout={handleLogout} userInitial={userInitial} />
        </div>
      ) : null}
      </aside>
    </>
  );
}
export default memo(AppSidebar);
