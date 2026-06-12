"use client";

import { usePathname } from "next/navigation";

import PortalViewport from "@/components/common/PortalViewport";

export default function CompanyLayout({ children }) {
  const pathname = usePathname() || "";
  if (pathname === "/company/auth") {
    return children;
  }
  return <PortalViewport>{children}</PortalViewport>;
}
