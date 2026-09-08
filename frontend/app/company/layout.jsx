"use client";

import { usePathname } from "next/navigation";

import PortalViewport from "@/components/common/PortalViewport";
import ProtectedRoute from "@/components/common/ProtectedRoute";

export default function CompanyLayout({ children }) {
  const pathname = usePathname() || "";
  if (pathname === "/company/auth") {
    return children;
  }

  return (
    <ProtectedRoute allowedRoles={["company", "companyadmin", "superadmin"]}>
      <PortalViewport>{children}</PortalViewport>
    </ProtectedRoute>
  );
}
