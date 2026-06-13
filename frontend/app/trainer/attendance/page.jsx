"use client";

import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

const TrainerAttendancePage = dynamic(
  () => import("@/portals/trainer/TrainerAttendancePage"),
  {
    loading: () => (
      <PortalLoadingState
        title="Loading Attendance"
        description="Preparing your attendance upload page."
      />
    ),
  },
);

export default function TrainerAttendanceRoute() {
  return <TrainerAttendancePage />;
}
