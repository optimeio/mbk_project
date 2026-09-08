"use client";

import PortalViewport from "@/components/common/PortalViewport";
import ProtectedRoute from "@/components/common/ProtectedRoute";

export default function TrainerLayout({ children }) {
  return (
    <ProtectedRoute allowedRoles={["trainer"]}>
      <PortalViewport>{children}</PortalViewport>
    </ProtectedRoute>
  );
}
