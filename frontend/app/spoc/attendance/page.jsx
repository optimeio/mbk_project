"use client";

import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

const AttendanceVerification = dynamic(
  () => import("@/portals/spoc/AttendanceVerification"),
  {
    loading: () => (
      <PortalLoadingState
        title="Loading Attendance"
        description="Fetching attendance records..."
      />
    ),
  }
);

export default function AttendancePage() {
  return <AttendanceVerification />;
}
