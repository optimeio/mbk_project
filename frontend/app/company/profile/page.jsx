"use client";

import dynamic from "next/dynamic";

import PortalLoadingState from "@/components/common/PortalLoadingState";

const CompanyProfile = dynamic(() => import("@/portals/company/CompanyProfile"), {
  loading: () => (
    <PortalLoadingState title="Loading profile" description="Fetching company profile." />
  ),
});

export default function CompanyProfilePage() {
  return <CompanyProfile />;
}
