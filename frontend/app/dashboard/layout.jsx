"use client";

import { usePathname } from "next/navigation";

import PortalViewport from "@/components/common/PortalViewport";

export default function DashboardLayout({ children }) {
  const pathname = usePathname() || "";
  const isComplaintsPage = pathname.startsWith("/dashboard/complaints");
  const isDocumentsPage = pathname.startsWith("/dashboard/documents");

  return (
    <PortalViewport
      compact={isComplaintsPage}
      contentInnerClassName={isDocumentsPage ? "p-0 md:p-0" : ""}
    >
      {children}
    </PortalViewport>
  );
}
