import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

export const metadata = {
  title: 'Attendance Reports',
  description: 'View and verify trainer attendance records, geo-tagged evidence, and overall attendance analytics.',
};

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
