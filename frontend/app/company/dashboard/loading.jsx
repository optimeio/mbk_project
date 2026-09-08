'use client';

import PortalLoadingState from '@/components/common/PortalLoadingState';

export default function CompanyDashboardLoading() {
  return (
    <PortalLoadingState
      title="Loading dashboard"
      description="Preparing company overview."
    />
  );
}
