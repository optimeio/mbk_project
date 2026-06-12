"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import AppSidebar from "@/components/common/AppSidebar";
import PortalTopbar from "@/components/common/PortalTopbar";
import MobileBottomNav from "@/components/common/MobileBottomNav";

const joinClassNames = (...classNames) => classNames.filter(Boolean).join(" ");
const KEEP_ALIVE_ROUTES = new Set([
  "/dashboard",
  "/spoc/dashboard",
  "/trainer/dashboard",
]);
const MAX_CACHED_PAGES = 2;

const hasOverflowOverride = (className = "") =>
  /(^|\s)(?:[a-z]+:)*overflo w(?:-[xy])?-[^\s]+/i.test(
    String(className || ""),
  );

const hasPaddingOverride = (className = "") =>
  /(^|\s)(?:[a-z]+:)*p(?:[trblxy])?-[^\s]+/i.test(String(className || ""));

const shouldKeepPageAlive = (pathname = "") => {
  const normalizedPath = String(pathname || "").trim();
  if (!normalizedPath) {
    return false;
  }

  return KEEP_ALIVE_ROUTES.has(normalizedPath);
};

export default function PortalViewport({
  children,
  compact = false,
  showTopbar = true,
  contentWrapperClassName = "",
  contentInnerClassName = "",
}) {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const searchKey = searchParams?.toString() || "";
  const pageKey = searchKey ? `${pathname}?${searchKey}` : pathname;
  const canKeepPageAlive = shouldKeepPageAlive(pathname);
  const [cache, setCache] = useState(() => {
    const initialKeys = canKeepPageAlive && pageKey ? [pageKey] : [];
    const initialPages = {};
    if (canKeepPageAlive && pageKey) {
      initialPages[pageKey] = children;
    }
    return { keys: initialKeys, pages: initialPages };
  });

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const pageWrapperClassName = joinClassNames(
    "h-full min-w-0",
    hasOverflowOverride(contentWrapperClassName) ? "" : "overflow-y-auto",
    contentWrapperClassName,
  );
  const pageInnerClassName = joinClassNames(
    hasPaddingOverride(contentInnerClassName) ? "" : "p-4 pb-24 md:p-6 md:pb-6",
    contentInnerClassName,
  );

  useEffect(() => {
    // Close mobile sidebar on route change
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!canKeepPageAlive || !pageKey) {
      return undefined;
    }

    setCache((prev) => {
      const nextKeys = prev.keys.filter((key) => key !== pageKey);
      nextKeys.push(pageKey);

      const nextPages = { ...prev.pages, [pageKey]: children };

      while (nextKeys.length > MAX_CACHED_PAGES) {
        const evictedKey = nextKeys.shift();
        if (evictedKey) {
          delete nextPages[evictedKey];
        }
      }

      return {
        keys: nextKeys,
        pages: nextPages,
      };
    });

    return undefined;
  }, [canKeepPageAlive, pageKey, children]);

  const renderPagePane = (node, key, isActive) => (
    <section
      key={key}
      aria-hidden={!isActive}
      className={joinClassNames(
        "h-full min-h-0 min-w-0",
        isActive
          ? "relative z-10"
          : "pointer-events-none invisible absolute inset-0 z-0",
      )}
    >
      <div className={pageWrapperClassName}>
        <div className={pageInnerClassName}>{node}</div>
      </div>
    </section>
  );

  return (
    <div className="h-screen overflow-hidden bg-[#eef2f5] text-[#0f172a]">
      <AppSidebar
        compact={compact}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      <main className={joinClassNames("h-screen min-w-0", compact ? "md:pl-[60px]" : "md:pl-[332px]")}>
        <div className="flex h-full min-w-0 flex-col">
          {showTopbar ? (
            <PortalTopbar onMenuClick={() => setIsMobileSidebarOpen(true)} />
          ) : null}

          <div className="relative min-h-0 flex-1">
            {cache.keys.map((key) =>
              renderPagePane(
                cache.pages[key],
                key,
                key === pageKey,
              ),
            )}
            {!canKeepPageAlive ? renderPagePane(children, pageKey, true) : null}
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
