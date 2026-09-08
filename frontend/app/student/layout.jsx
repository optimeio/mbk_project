"use client";

import { usePathname } from "next/navigation";

import PortalViewport from "@/components/common/PortalViewport";
import ProtectedRoute from "@/components/common/ProtectedRoute";

export default function StudentLayout({ children }) {
  const pathname = usePathname() || "";
  if (pathname === "/student/auth" || pathname.startsWith("/student/forgot-password")) {
    return children;
  }

  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <PortalViewport>{children}</PortalViewport>
    </ProtectedRoute>
  );
}
