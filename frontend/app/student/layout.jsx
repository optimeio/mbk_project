"use client";

import { usePathname } from "next/navigation";

import PortalViewport from "@/components/common/PortalViewport";

export default function StudentLayout({ children }) {
  const pathname = usePathname() || "";
  if (pathname === "/student/auth") {
    return children;
  }
  return <PortalViewport>{children}</PortalViewport>;
}
