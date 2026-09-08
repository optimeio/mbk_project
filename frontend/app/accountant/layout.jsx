"use client";

import PortalViewport from "@/components/common/PortalViewport";
import ProtectedRoute from "@/components/common/ProtectedRoute";

export default function AccountantLayout({ children }) {
  return (
    <ProtectedRoute allowedRoles={["accountant", "superadmin"]}>
      <PortalViewport>{children}</PortalViewport>
    </ProtectedRoute>
  );
}
