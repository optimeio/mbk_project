"use client";

import Link from "next/link";
import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";

function SidebarNav({
  chatTab,
  isChatActive,
  navLinks,
  pathname,
  setChatTab,
}) {
  const handleChatTabClick = useCallback(
    (tab) => {
      if (!tab) {
        return;
      }
      localStorage.setItem("mbk_last_nav", tab);
      setChatTab(tab);
      window.dispatchEvent(
        new CustomEvent("mbk_chat_nav_change", { detail: tab }),
      );
    },
    [setChatTab],
  );

  return (
    <nav className="flex-1 overflow-y-auto py-4">
      {navLinks.map((item) => {
        const Icon = item.icon;
        const isActive = isChatActive
          ? item.tab === chatTab
          : pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

        return (
          <div
            key={item.tab ? `${item.href}-${item.tab}` : item.href}
            className="px-3 pb-1.5"
          >
            <Button
              asChild
              variant={isActive ? "secondary" : "ghost"}
              size="sm"
              className={`h-auto w-full justify-start gap-3 px-3 py-2.5 text-sm font-medium ${
                isActive
                  ? "bg-[#0f3f5c] text-[#4ade80] hover:bg-[#0f3f5c] hover:text-[#4ade80]"
                  : "text-[#f3f9ff] hover:bg-[#1a547a] hover:text-white"
              }`}
            >
              <Link
                href={item.href}
                prefetch={false}
                onClick={() => {
                  if (isChatActive && item.tab) {
                    handleChatTabClick(item.tab);
                  }
                }}
                className="no-underline hover:no-underline"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Icon
                  className={`h-4 w-4 ${isActive ? "text-[#8fe3ff]" : "text-[#cfe9f9]"}`}
                />
                <span className={isActive ? "text-[#4ade80]" : "text-[#f3f9ff]"}>
                  {item.label}
                </span>
              </Link>
            </Button>
          </div>
        );
      })}
    </nav>
  );
}

export default memo(SidebarNav);
