"use client";

import dynamic from "next/dynamic";

import PortalLoadingState from "@/components/common/PortalLoadingState";
import ProtectedRoute from "@/components/common/ProtectedRoute";

import { Suspense } from "react";

const SpocDashboard = dynamic(() => import("@/portals/spoc/SpocDashboard"), {
  loading: () => (
    <PortalLoadingState
      title="Loading SPOC dashboard"
      description="Preparing attendance and schedule insights."
    />
  ),
  ssr: false,
});

export default function SpocDashboardPage() {
  return (
    <Suspense
      fallback={
        <PortalLoadingState
          title="Streaming dashboard"
          description="Optimizing layout and synchronizing data layers."
        />
      }
    >
      <ProtectedRoute allowedRoles={["spocadmin", "collegeadmin", "superadmin"]}>
        <SpocDashboard />
      </ProtectedRoute>
    </Suspense>
  );
}
