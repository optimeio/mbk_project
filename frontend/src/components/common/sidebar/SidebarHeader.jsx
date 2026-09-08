"use client";

import { Badge } from "@/components/ui/badge";

export default function SidebarHeader({ portalTitle }) {
  return (
    <div className="flex h-16 items-center border-b border-[#2b6d93] px-4">
      <div className="min-w-0">
        <Badge variant="secondary" className="max-w-full truncate bg-white/10 text-[11px] font-semibold uppercase tracking-wider text-[#d6efff] hover:bg-white/10">
          {portalTitle}
        </Badge>
      </div>
    </div>
  );
}
