"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bars3Icon,
  ChatBubbleLeftRightIcon,
  ChevronLeftIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  complaintsLinksByRole,
  homeLinksByRole,
  resolveNavLinks,
  resolvePortalTitle,
  resolveSidebarRole,
} from "@/components/common/sidebar/sidebarConfig";

const NotificationBell = dynamic(
  () => import("@/components/common/NotificationBell"),
  {
    ssr: false,
    loading: () => null,
  },
);

const humanizePathSegment = (segment = "") =>
  String(segment || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const resolveCurrentSection = (pathname, activeRole, isChatActive) => {
  if (!pathname || pathname === "/") {
    return "Overview";
  }

  if (isChatActive) {
    return "Conversations";
  }

  const navLinks = [...resolveNavLinks({ activeRole, isChatActive })].sort(
    (left, right) => String(right.href || "").length - String(left.href || "").length,
  );

  const matchedLink = navLinks.find(({ href }) => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  });

  if (matchedLink?.label) {
    return matchedLink.label;
  }

  const segments = pathname.split("/").filter(Boolean);
  return humanizePathSegment(segments[segments.length - 1] || "Overview");
};

function PortalTopbar({ onMenuClick }) {
  const router = useRouter();
  const pathname = usePathname() || "";
  const { currentUser } = useAuth();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);

  const activeRole = useMemo(
    () => resolveSidebarRole(currentUser?.role, pathname),
    [currentUser?.role, pathname],
  );

  const isChatActive = pathname.startsWith("/chat");
  const showMobileBackButton = isChatActive;
  const portalTitle = useMemo(
    () => resolvePortalTitle(activeRole, isChatActive),
    [activeRole, isChatActive],
  );
  const sectionTitle = useMemo(
    () => resolveCurrentSection(pathname, activeRole, isChatActive),
    [activeRole, isChatActive, pathname],
  );
  const isCompactChatTopbar = isChatActive;

  const displayName =
    currentUser?.name || currentUser?.displayName || currentUser?.email || "Portal User";
  const userInitial = String(displayName || "U").charAt(0).toUpperCase();
  const fallbackRoute = homeLinksByRole[activeRole] || "/dashboard";
  const complaintsRoute = complaintsLinksByRole[activeRole] || "/trainer/complaints";
  const profileRoute = activeRole === "Trainer" ? "/trainer/profile" : fallbackRoute;

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target)
      ) {
        setIsAccountMenuOpen(false);
      }
    };

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const handleBackClick = useCallback(() => {
    if (isChatActive && typeof window !== "undefined") {
      const chatBackEvent = new CustomEvent("mbk:chat-topbar-back", {
        cancelable: true,
      });
      const chatBackHandled = !window.dispatchEvent(chatBackEvent);
      if (chatBackHandled) {
        return;
      }
      router.push(fallbackRoute);
      return;
    }

    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackRoute);
  }, [fallbackRoute, isChatActive, router]);

  const handleProfileClick = useCallback(() => {
    setIsAccountMenuOpen(false);
    router.push(profileRoute);
  }, [profileRoute, router]);

  const handleComplaintsClick = useCallback(() => {
    setIsAccountMenuOpen(false);
    router.push(complaintsRoute);
  }, [complaintsRoute, router]);

  return (
    <header className="relative z-40 shrink-0 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className={`flex items-center gap-4 px-4 md:px-6 ${isCompactChatTopbar ? "h-16 justify-end" : "h-20 justify-between"}`}>
        {!isCompactChatTopbar ? (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {showMobileBackButton ? (
                <button
                  type="button"
                  onClick={handleBackClick}
                  aria-label="Go back"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 md:hidden"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onMenuClick}
                  aria-label="Open navigation menu"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 md:hidden"
                >
                  <Bars3Icon className="h-5 w-5" />
                </button>
              )}

              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                <span className="inline-flex h-2 w-2 rounded-full bg-[#1d5f87]" />
                <span className="truncate">{portalTitle}</span>
              </div>
            </div>
            <h1 className="mt-1 truncate text-xl font-semibold text-slate-900 md:text-2xl">
              {sectionTitle}
            </h1>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <div className={isCompactChatTopbar ? "hidden" : "hidden min-w-0 text-right md:block"}>
            <p className="truncate text-sm font-semibold text-slate-900">
              {displayName}
            </p>
            <p className="truncate text-xs text-slate-500">
              {currentUser?.email || portalTitle}
            </p>
          </div>

          {!isCompactChatTopbar ? (
            <NotificationBell
              iconClassName="h-5 w-5 text-slate-600"
              badgeClassName="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white"
            />
          ) : null}

          <div ref={accountMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsAccountMenuOpen((previousOpen) => !previousOpen)}
              aria-label="Open account menu"
              className="rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5f87]/30"
            >
              <Avatar className="h-11 w-11 rounded-2xl border border-[#d6e5f0] bg-[#f4f9fc] shadow-sm">
                <AvatarFallback className="rounded-2xl bg-[#f4f9fc] text-sm font-semibold text-[#1d5f87]">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
            </button>

            {isAccountMenuOpen ? (
              <div className="absolute right-0 top-full z-[70] mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
                <div className="p-2">
                  <button
                    type="button"
                    onClick={handleProfileClick}
                    className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                      <UserCircleIcon className="h-4 w-4 text-slate-500" />
                    </span>
                    Profile
                  </button>
                  <button
                    type="button"
                    onClick={handleComplaintsClick}
                    className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                      <ChatBubbleLeftRightIcon className="h-4 w-4 text-slate-500" />
                    </span>
                    Complaints
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
export default memo(PortalTopbar);
