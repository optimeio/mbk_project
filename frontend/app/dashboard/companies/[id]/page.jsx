"use client";

import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

const CompanyDetails = dynamic(() => import("@/portals/admin/CompanyDetails"), {
  loading: () => (
    <PortalLoadingState
      title="Loading company details"
      description="Fetching company profile, courses, and invite data."
    />
  ),
});

export default function CompanyDetailsPage() {
  return <CompanyDetails />;
}
