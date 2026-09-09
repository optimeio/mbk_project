import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

export const metadata = {
  title: 'Trainer Attendance Requests',
  description: 'Review and verify late attendance requests submitted by trainers with check-in, student sheets, classroom activities, and check-out evidence.',
};

const TrainerAttendanceRequests = dynamic(
  () => import("@/portals/admin/TrainerAttendanceRequests"),
  {
    loading: () => (
      <PortalLoadingState
        title="Loading Attendance Requests"
        description="Fetching trainer late attendance submissions and verification proofs."
      />
    ),
  },
);

export default function TrainerAttendanceRequestsPage() {
  return <TrainerAttendanceRequests />;
}
