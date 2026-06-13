"use client";

import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

const TrainerDashboard = dynamic(
  () => import("@/portals/trainer/TrainerDashboard"),
  {
    loading: () => (
      <PortalLoadingState
        title="Loading dashboard"
        description="Preparing your trainer overview."
      />
    ),
  },
);

export default function TrainerDashboardPage() {
  return <TrainerDashboard />;
}
