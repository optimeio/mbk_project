"use client";

import PortalViewport from "@/components/common/PortalViewport";
import ProtectedRoute from "@/components/common/ProtectedRoute";

export default function SpocShell({ children }) {
  return (
    <ProtectedRoute allowedRoles={["spocadmin", "collegeadmin", "superadmin"]}>
      <PortalViewport>{children}</PortalViewport>
    </ProtectedRoute>
  );
}
