"use client";

import Link from "next/link";
import { memo } from "react";
import { FileText, Home, LogOut, MessageSquareMore } from "lucide-react";
import { Button } from "@/components/ui/button";
import PortalBrandMark from "@/components/common/PortalBrandMark";

const railLinkClass = (isActive) =>
  `mt-3 flex h-8 w-8 items-center justify-center rounded-md transition ${
    isActive
      ? "bg-[#0f3f5c] text-[#7fd8ff]"
      : "text-[#cbe6f5] hover:bg-white/10 hover:text-white"
  }`;

function SidebarRail({
  compact = false,
  complaintsHref,
  handleLogout,
  homeHref,
  isChatActive,
  isComplaintsActive,
  isHomeActive,
}) {
  return (
    <div
      className={`flex w-12 flex-col items-center bg-[#1a567b] py-3 ${
        compact ? "" : "border-r border-[#2b6d93]"
      }`}
    >
      <PortalBrandMark
        href={homeHref}
        compact
        className="h-8 w-8 rounded-md border-white/20 bg-white p-0.5 shadow-none ring-1 ring-white/20 hover:border-white/30 hover:bg-white"
        imageClassName="h-full w-full rounded-sm object-contain object-center"
      />

      <Button
        asChild
        size="icon"
        variant="ghost"
        className={railLinkClass(isHomeActive).replace("mt-3", "mt-4")}
        aria-label="Home"
        title="Home"
      >
        <Link href={homeHref} prefetch>
          <Home className="h-4 w-4" />
        </Link>
      </Button>

      {complaintsHref ? (
        <Button
          asChild
          size="icon"
          variant="ghost"
          className={railLinkClass(isComplaintsActive)}
          aria-label="Complaints"
          title="Complaints"
        >
          <Link href={complaintsHref} prefetch>
            <FileText className="h-4 w-4" />
          </Link>
        </Button>
      ) : null}

      <Button
        asChild
        size="icon"
        variant="ghost"
        className={railLinkClass(isChatActive)}
        aria-label="Open chat"
        title="Open chat"
      >
        <Link href="/chat" prefetch>
          <MessageSquareMore className="h-4 w-4" />
        </Link>
      </Button>

      <div className="flex-1" />

      {compact ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleLogout}
          className="mb-1 h-8 w-8 rounded-md text-[#ffd8df] transition hover:bg-white/10 hover:text-white"
          aria-label="Logout"
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

export default memo(SidebarRail);
