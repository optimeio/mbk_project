"use client";

import dynamic from "next/dynamic";

import PortalLoadingState from "@/components/common/PortalLoadingState";

const TrainerOverallAttendance = dynamic(
  () => import("@/portals/admin/TrainerOverallAttendance"),
  {
    loading: () => (
      <PortalLoadingState
        title="Loading attendance report"
        description="Preparing trainer attendance and geo evidence."
      />
    ),
  },
);

export default function TrainerOverallAttendancePage() {
  return <TrainerOverallAttendance />;
}
