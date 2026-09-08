"use client";

import dynamic from "next/dynamic";

import PortalLoadingState from "@/components/common/PortalLoadingState";

const CompanyReports = dynamic(() => import("@/portals/company/CompanyReports"), {
  loading: () => (
    <PortalLoadingState title="Loading reports" description="Fetching workflow reports." />
  ),
});

export default function CompanyReportsPage() {
  return <CompanyReports />;
}
