"use client";

import Link from "next/link";
import { memo } from "react";
import { Button } from "@/components/ui/button";

function SidebarNav({
  navLinks,
  pathname,
}) {
  return (
    <nav className="flex-1 overflow-y-auto py-4">
      {navLinks.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));

        return (
          <div
            key={item.href}
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
