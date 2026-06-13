"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bars3Icon, ChevronLeftIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import { MessageSquare as ChatBubbleLeftRightIcon } from "lucide-react";


import useDebouncedNavigate from "@/hooks/useDebouncedNavigate";
import { useAuth } from "@/context/AuthContext";
import PortalBrandMark from "@/components/common/PortalBrandMark";
import PortalTopbarErrorBoundary from "@/components/common/PortalTopbarErrorBoundary";
import PortalUserAvatar from "@/components/common/PortalUserAvatar";
import useTrainerPortalProfile from "@/hooks/useTrainerPortalProfile";
import {
  getPortalUserDisplayName,
  getPortalUserInitial,
  isPortalRecord,
  normalizePortalUser,
} from "@/utils/portalUserDisplay";
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

const resolveCurrentSection = (pathname, activeRole) => {
  if (!pathname || pathname === "/") {
    return "Overview";
  }

  const navLinks = [...resolveNavLinks({ activeRole })].sort(
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

const IdentityTextSkeleton = ({ className = "" }) => (
  <span
    className={`inline-block animate-pulse rounded-md bg-slate-200/80 ${className}`}
    aria-hidden
  />
);

function PortalTopbarInner({ onMenuClick = () => {} }) {
  const router = useRouter();
  const debouncedNavigate = useDebouncedNavigate();
  const pathname = usePathname() || "";
  const { currentUser, loading: authLoading } = useAuth();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);

  const safeUser = useMemo(() => normalizePortalUser(currentUser), [currentUser]);

  const activeRole = useMemo(
    () => resolveSidebarRole(safeUser.role, pathname),
    [pathname, safeUser.role],
  );

  const portalTitle = useMemo(
    () => resolvePortalTitle(activeRole),
    [activeRole],
  );
  const sectionTitle = useMemo(
    () => resolveCurrentSection(pathname, activeRole),
    [activeRole, pathname],
  );
  const isTrainerPortal = pathname.startsWith("/trainer");

  const profileQueryEnabled =
    isTrainerPortal && !authLoading && Boolean(currentUser);

  const {
    data: trainerProfile,
    isLoading: isTrainerProfileLoading,
  } = useTrainerPortalProfile({
    enabled: profileQueryEnabled,
  });

  const safeProfile = useMemo(
    () => (isPortalRecord(trainerProfile) ? trainerProfile : null),
    [trainerProfile],
  );

  const isIdentityLoading =
    authLoading
    || (profileQueryEnabled && isTrainerProfileLoading && !safeProfile);

  const displayName = getPortalUserDisplayName(safeProfile || safeUser);
  const avatarInitial = getPortalUserInitial(safeProfile || safeUser);
  const emailLine = safeUser.email || portalTitle;
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
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    debouncedNavigate(fallbackRoute);
  }, [debouncedNavigate, fallbackRoute, router]);

  const closeAccountMenu = useCallback(() => {
    setIsAccountMenuOpen(false);
  }, []);

  return (
    <header className="relative z-40 shrink-0 overflow-hidden border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div
        className="flex min-w-0 items-center gap-2 px-3 sm:gap-3 sm:px-4 md:px-6 h-[4.5rem] justify-between sm:h-20"
      >
        <div className="min-w-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onMenuClick}
                aria-label="Open navigation menu"
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 md:hidden"
              >
                <Bars3Icon className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                <span className="inline-flex h-2 w-2 rounded-full bg-[#1d5f87]" />
                <span className="truncate">{portalTitle}</span>
              </div>
            </div>
            <h1 className="mt-1 truncate text-xl font-semibold text-slate-900 md:text-2xl">
              {sectionTitle}
            </h1>
          </div>

        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2.5">
          <div className="hidden min-w-0 max-w-[34vw] text-right md:block lg:max-w-xs">
              {isIdentityLoading ? (
                <>
                  <IdentityTextSkeleton className="ml-auto h-4 w-28" />
                  <IdentityTextSkeleton className="ml-auto mt-1 h-3 w-36" />
                </>
              ) : (
                <>
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {displayName}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {emailLine}
                  </p>
                </>
              )}
          </div>

          <NotificationBell
            iconClassName="h-5 w-5 text-slate-600"
            badgeClassName="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white"
          />

          {isTrainerPortal ? (
            <PortalBrandMark
              href="/trainer/dashboard"
            />
          ) : null}

          <div ref={accountMenuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsAccountMenuOpen((previousOpen) => !previousOpen)}
              aria-label={`Open account menu for ${displayName}`}
              className="rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5f87]/30"
            >
              <PortalUserAvatar
                user={safeUser}
                profile={isTrainerPortal ? safeProfile : null}
                initial={avatarInitial}
                isLoading={isIdentityLoading}
              />
            </button>

            {isAccountMenuOpen ? (
              <div className="absolute right-0 top-full z-[70] mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
                <div className="p-2">
                  <Link
                    href={profileRoute}
                    prefetch
                    onClick={closeAccountMenu}
                    className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                      <UserCircleIcon className="h-4 w-4 text-slate-500" />
                    </span>
                    Profile
                  </Link>
                  <Link
                    href={complaintsRoute}
                    prefetch
                    onClick={closeAccountMenu}
                    className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                      <ChatBubbleLeftRightIcon className="h-4 w-4 text-slate-500" />
                    </span>
                    Complaints
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

function PortalTopbar(props) {
  return (
    <PortalTopbarErrorBoundary>
      <PortalTopbarInner {...props} />
    </PortalTopbarErrorBoundary>
  );
}

export default memo(PortalTopbar);
