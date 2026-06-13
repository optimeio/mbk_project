"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import AppSidebar from "@/components/common/AppSidebar";
import PortalTopbar from "@/components/common/PortalTopbar";
import MobileBottomNav from "@/components/common/MobileBottomNav";

const joinClassNames = (...classNames) => classNames.filter(Boolean).join(" ");

const hasOverflowOverride = (className = "") =>
  /(^|\s)(?:[a-z]+:)*overflow(?:-[xy])?-[^\s]+/i.test(String(className || ""));

const hasPaddingOverride = (className = "") =>
  /(^|\s)(?:[a-z]+:)*p(?:[trblxy])?-[^\s]+/i.test(String(className || ""));

function PortalViewport({
  children,
  compact = false,
  showTopbar = true,
  contentWrapperClassName = "",
  contentInnerClassName = "",
}) {
  const pathname = usePathname() || "";
  // Scroll restoration is per route segment; query-string changes should not
  // re-render the full portal chrome (sidebar, topbar, bottom nav).
  const pageKey = pathname;

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const scrollPositionsRef = useRef(new Map());
  const activeScrollRef = useRef(null);
  const previousPageKeyRef = useRef(pageKey);

  const pageWrapperClassName = joinClassNames(
    "h-full min-w-0",
    hasOverflowOverride(contentWrapperClassName) ? "" : "overflow-y-auto",
    contentWrapperClassName,
  );
  const pageInnerClassName = joinClassNames(
    hasPaddingOverride(contentInnerClassName) ? "" : "p-4 pb-24 md:p-6 md:pb-6",
    contentInnerClassName,
  );

  const saveScrollPosition = useCallback((key, element) => {
    if (!key || !element) {
      return;
    }
    scrollPositionsRef.current.set(key, element.scrollTop);
  }, []);

  const restoreScrollPosition = useCallback((key, element) => {
    if (!key || !element) {
      return;
    }
    const savedScrollTop = scrollPositionsRef.current.get(key);
    if (typeof savedScrollTop === "number") {
      element.scrollTop = savedScrollTop;
    }
  }, []);

  const registerScrollContainer = useCallback(
    (key, element) => {
      if (!element) {
        return undefined;
      }

      if (activeScrollRef.current && previousPageKeyRef.current) {
        saveScrollPosition(previousPageKeyRef.current, activeScrollRef.current);
      }

      activeScrollRef.current = element;
      previousPageKeyRef.current = key;
      restoreScrollPosition(key, element);

      return () => {
        if (activeScrollRef.current === element) {
          saveScrollPosition(key, element);
          activeScrollRef.current = null;
        }
      };
    },
    [restoreScrollPosition, saveScrollPosition],
  );

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="h-screen overflow-hidden bg-[#eef2f5] text-[#0f172a]">
      <AppSidebar
        compact={compact}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      <main
        className={joinClassNames(
          "h-screen min-w-0",
          compact ? "md:pl-[60px]" : "md:pl-[332px]",
        )}
      >
        <div className="flex h-full min-w-0 flex-col">
          {showTopbar ? (
            <PortalTopbar onMenuClick={() => setIsMobileSidebarOpen(true)} />
          ) : null}

          <div className="relative min-h-0 flex-1">
            <section className="relative z-10 h-full min-h-0 min-w-0">
              <div
                ref={(element) => registerScrollContainer(pageKey, element)}
                className={pageWrapperClassName}
                data-portal-content="true"
              >
                <div className={joinClassNames(pageInnerClassName, "box-border min-w-0 max-w-full")}>
                  {children}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}

export default memo(PortalViewport);
