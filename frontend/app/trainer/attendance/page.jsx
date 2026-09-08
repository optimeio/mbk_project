"use client";

import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

const TrainerAttendancePage = dynamic(
  () => import("@/portals/trainer/TrainerAttendancePage"),
  {
    loading: () => (
      <PortalLoadingState
        title="Loading Attendance History"
        description="Retrieving your past attendance records and verification status..."
      />
    ),
    ssr: false,
  }
);

export default function TrainerAttendanceRoute() {
  return <TrainerAttendancePage />;
}


