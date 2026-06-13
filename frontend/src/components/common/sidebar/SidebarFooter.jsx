"use client";

import { memo } from "react";
import LogOut from "lucide-react/dist/esm/icons/log-out";
import { Button } from "@/components/ui/button";
import PortalUserAvatar from "@/components/common/PortalUserAvatar";

function SidebarFooter({ handleLogout = () => {}, user = null, profile = null, userInitial }) {
  return (
    <div className="border-t border-[#2b6d93] p-4">
      <Button
        type="button"
        variant="ghost"
        onClick={handleLogout}
        className="h-auto w-full justify-start gap-3 rounded-lg px-2 py-1.5 text-left text-[#ffe3e7] transition hover:bg-[#184d70] hover:text-white"
      >
        <PortalUserAvatar
          user={user}
          profile={profile}
          initial={userInitial}
          className="h-10 w-10 shrink-0 rounded-xl border border-[#0f3f5c] bg-[#0f3f5c]"
          fallbackClassName="rounded-xl bg-[#0f3f5c] text-sm font-semibold uppercase text-white"
          imageClassName="h-full w-full object-cover"
        />
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[#ffe3e7]">
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="truncate">Logout</span>
        </span>
      </Button>
    </div>
  );
}

export default memo(SidebarFooter);
