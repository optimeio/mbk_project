"use client";

import dynamic from "next/dynamic";

import PortalLoadingState from "@/components/common/PortalLoadingState";

const CompanyMonitoring = dynamic(() => import("@/portals/company/CompanyMonitoring"), {
  loading: () => (
    <PortalLoadingState title="Loading monitoring" description="Fetching live session data." />
  ),
});

export default function CompanyMonitoringPage() {
  return <CompanyMonitoring />;
}
