"use client";

import dynamic from 'next/dynamic';
import PortalLoadingState from "@/components/common/PortalLoadingState";

const TrainerActivities = dynamic(() => import('@/portals/trainer/TrainerActivities'), {
  loading: () => (
    <PortalLoadingState
      title="Loading Activities Workflow"
      description="Initializing daily checklist and GPS geofence tracker..."
    />
  ),
  ssr: false,
});

export default function TrainerActivitiesPage() {
  return <TrainerActivities />;
}
