"use client";

import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

const TrainerAnalytics = dynamic(
  () => import("@/portals/spoc/TrainerAnalytics"),
  {
    loading: () => (
      <PortalLoadingState
        title="Loading Analytics"
        description="Crunching trainer performance data..."
      />
    ),
  }
);

export default function AnalyticsPage() {
  return <TrainerAnalytics />;
}
