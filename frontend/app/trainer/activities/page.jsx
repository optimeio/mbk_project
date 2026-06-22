import dynamic from 'next/dynamic';
import PortalLoadingState from "@/components/common/PortalLoadingState";

export const metadata = {
  title: 'Trainer Activities',
  description: 'Manage your daily trainer activities, checklist workflows, and GPS geofence tracking on MBK Carrierz.',
};

const TrainerActivities = dynamic(() => import('@/portals/trainer/TrainerActivities'), {
  loading: () => (
    <PortalLoadingState
      title="Loading Activities Workflow"
      description="Initializing daily checklist and GPS geofence tracker..."
    />
  ),
});

export default function TrainerActivitiesPage() {
  return <TrainerActivities />;
}
