"use client";

import dynamic from "next/dynamic";

import PortalLoadingState from "@/components/common/PortalLoadingState";
import ProtectedRoute from "@/components/common/ProtectedRoute";

const AccountantDashboard = dynamic(
  () => import("@/portals/accountant/AccountantDashboard"),
  {
    loading: () => (
      <PortalLoadingState
        title="Loading accountant dashboard"
        description="Preparing salary metrics and payout summaries."
      />
    ),
  },
);

export default function AccountantDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["accountant", "superadmin"]}>
      <AccountantDashboard />
    </ProtectedRoute>
  );
}
