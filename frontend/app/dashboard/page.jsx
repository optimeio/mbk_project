"use client";

import dynamic from "next/dynamic";

import PortalLoadingState from "@/components/common/PortalLoadingState";
import ProtectedRoute from "@/components/common/ProtectedRoute";

const DashboardPage = dynamic(() => import("@/portals/admin/DashboardPage"), {
  loading: () => (
    <PortalLoadingState
      title="Loading dashboard"
      description="Preparing your admin overview and recent activity."
    />
  ),
});

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
      <DashboardPage />
    </ProtectedRoute>
  );
}
