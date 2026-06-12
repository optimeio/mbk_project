"use client";

import dynamic from "next/dynamic";

import PortalLoadingState from "@/components/common/PortalLoadingState";

const TrainerOverallAttendance = dynamic(
  () => import("@/portals/admin/TrainerOverallAttendance"),
  {
    loading: () => (
      <PortalLoadingState
        title="Loading overall attendance"
        description="Preparing cross-college attendance reports."
      />
    ),
  },
);

export default function SpocOverallAttendancePage() {
  return <TrainerOverallAttendance />;
}
