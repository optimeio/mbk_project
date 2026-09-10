"use client";

import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

const TrainerUpcomingSchedule = dynamic(
  () => import("@/portals/trainer/TrainerUpcomingSchedule"),
  {
    loading: () => (
      <PortalLoadingState
        title="Loading Schedule"
        description="Fetching your upcoming training sessions..."
      />
    ),
  }
);

export default function UpcomingSchedulePage() {
  return <TrainerUpcomingSchedule />;
}
