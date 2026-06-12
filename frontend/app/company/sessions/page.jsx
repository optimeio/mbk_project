"use client";

import dynamic from "next/dynamic";

import PortalLoadingState from "@/components/common/PortalLoadingState";

const CompanySessions = dynamic(() => import("@/portals/company/CompanySessions"), {
  loading: () => (
    <PortalLoadingState title="Loading sessions" description="Fetching training sessions." />
  ),
});

export default function CompanySessionsPage() {
  return <CompanySessions />;
}
