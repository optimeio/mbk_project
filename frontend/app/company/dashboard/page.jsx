"use client";

import dynamic from "next/dynamic";

import PortalLoadingState from "@/components/common/PortalLoadingState";
import ProtectedRoute from "@/components/common/ProtectedRoute";

const CompanyDashboard = dynamic(() => import("@/portals/company/CompanyDashboard"), {
  loading: () => (
    <PortalLoadingState title="Loading dashboard" description="Preparing company overview." />
  ),
});

export default function CompanyDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["company", "companyadmin"]}>
      <CompanyDashboard />
    </ProtectedRoute>
  );
}
