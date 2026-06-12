"use client";

import dynamic from "next/dynamic";

import PortalLoadingState from "@/components/common/PortalLoadingState";

const CompanyColleges = dynamic(() => import("@/portals/company/CompanyColleges"), {
  loading: () => (
    <PortalLoadingState title="Loading colleges" description="Fetching partner colleges." />
  ),
});

export default function CompanyCollegesPage() {
  return <CompanyColleges />;
}
