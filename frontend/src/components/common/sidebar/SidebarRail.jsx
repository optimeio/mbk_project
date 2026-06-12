"use client";

import Image from "next/image";
import { useState } from "react";
import { FileText, Home, LogOut, MessageSquareMore } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SidebarRail({
  compact = false,
  complaintsHref,
  handleLogout,
  homeHref,
  isChatActive,
  isComplaintsActive,
  isHomeActive,
  onNavigate,
}) {
  const [showLogoFallback, setShowLogoFallback] = useState(false);

  return (
    <div
      className={`flex w-12 flex-col items-center bg-[#1a567b] py-3 ${
        compact ? "" : "border-r border-[#2b6d93]"
      }`}
    >
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => onNavigate(homeHref)}
        className="h-8 w-8 rounded-md bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/15 hover:text-white"
        aria-label="Dashboard"
        title="Dashboard"
      >
        {showLogoFallback ? (
          <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-white/12 text-[9px] font-black tracking-[0.18em] text-white">
            MBK
          </span>
        ) : (
          <Image
            src="/logos/mbkz-64.png"
            alt="MBK Carrierz"
            width={24}
            height={24}
            className="h-6 w-6 rounded-sm object-contain"
            onError={() => setShowLogoFallback(true)}
            priority
          />
        )}
      </Button>

      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => onNavigate(homeHref)}
        className={`mt-4 h-8 w-8 rounded-md transition ${
          isHomeActive ? "bg-[#0f3f5c] text-[#7fd8ff]" : "text-[#cbe6f5] hover:bg-white/10 hover:text-white"
        }`}
        aria-label="Home"
        title="Home"
      >
        <Home className="h-4 w-4" />
      </Button>

      {complaintsHref ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => onNavigate(complaintsHref)}
          className={`mt-3 h-8 w-8 rounded-md transition ${
            isComplaintsActive ? "bg-[#0f3f5c] text-[#7fd8ff]" : "text-[#cbe6f5] hover:bg-white/10 hover:text-white"
          }`}
          aria-label="Complaints"
          title="Complaints"
        >
          <FileText className="h-4 w-4" />
        </Button>
      ) : null}

      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => onNavigate("/chat")}
        className={`mt-3 h-8 w-8 rounded-md transition ${
          isChatActive ? "bg-[#0f3f5c] text-[#7fd8ff]" : "text-[#cbe6f5] hover:bg-white/10 hover:text-white"
        }`}
        aria-label="Open chat"
        title="Open chat"
      >
        <MessageSquareMore className="h-4 w-4" />
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
