"use client";

import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

const SpocCollegeDetails = dynamic(
  () => import("@/portals/spoc/CollegeDetails"),
  {
    loading: () => (
      <PortalLoadingState
        title="Loading college details"
        description="Fetching college trainers, schedules, and attendance data."
      />
    ),
  }
);

export default function SpocCollegeDetailsPage() {
  return <SpocCollegeDetails />;
}
