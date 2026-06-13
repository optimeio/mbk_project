'use client';

import PortalLoadingState from '@/components/common/PortalLoadingState';

export default function StudentDashboardLoading() {
  return (
    <PortalLoadingState
      title="Loading dashboard"
      description="Preparing your student overview."
    />
  );
}
