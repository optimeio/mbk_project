"use client";

import dynamic from "next/dynamic";

import PortalLoadingState from "@/components/common/PortalLoadingState";

const CompanyTrainers = dynamic(() => import("@/portals/company/CompanyTrainers"), {
  loading: () => (
    <PortalLoadingState title="Loading trainers" description="Fetching assigned trainers." />
  ),
});

export default function CompanyHiringPage() {
  return <CompanyTrainers />;
}
