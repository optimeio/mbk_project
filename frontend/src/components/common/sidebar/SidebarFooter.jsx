"use client";

import LogOut from "lucide-react/dist/esm/icons/log-out";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function SidebarFooter({ handleLogout, userInitial }) {
  return (
    <div className="border-t border-[#2b6d93] p-4">
      <Button
        type="button"
        variant="ghost"
        onClick={handleLogout}
        className="h-auto w-full justify-start gap-3 rounded-lg px-2 py-1.5 text-left text-[#ffe3e7] transition hover:bg-[#184d70] hover:text-white"
      >
        <Avatar className="h-10 w-10 border border-[#0f3f5c] bg-[#0f3f5c]">
          <AvatarFallback className="bg-[#0f3f5c] text-sm font-semibold text-white">
            {userInitial}
          </AvatarFallback>
        </Avatar>
        <span className="flex items-center gap-2 text-sm font-semibold text-[#ffe3e7]">
          <LogOut className="h-4 w-4" />
          Logout
        </span>
      </Button>
    </div>
  );
}
