import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

export const metadata = {
  title: 'Trainer Dashboard',
  description: 'MBK Carrierz trainer dashboard — view schedules, attendance, student activities, and performance reports.',
};

const TrainerDashboard = dynamic(
  () => import("@/portals/trainer/TrainerDashboard"),
  {
      loading: () => (
      <PortalLoadingState
        title="Loading dashboard"
        description="Preparing your trainer overview."
      />
    ),
  },
);

export default function TrainerDashboardPage() {
  return <TrainerDashboard />;
}
