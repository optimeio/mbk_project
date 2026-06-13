"use client";

import { usePathname } from "next/navigation";

import PortalViewport from "@/components/common/PortalViewport";
import ProtectedRoute from "@/components/common/ProtectedRoute";

export default function DashboardLayout({ children }) {
  const pathname = usePathname() || "";
  const isComplaintsPage = pathname.startsWith("/dashboard/complaints");
  const isDocumentsPage = pathname.startsWith("/dashboard/documents");

  return (
    <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
      <PortalViewport
        compact={isComplaintsPage}
        contentInnerClassName={isDocumentsPage ? "p-0 md:p-0" : ""}
      >
        {children}
      </PortalViewport>
    </ProtectedRoute>
  );
}
