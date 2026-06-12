"use client";

import dynamic from "next/dynamic";

import PortalLoadingState from "@/components/common/PortalLoadingState";

const Companies = dynamic(() => import("@/portals/admin/Companies"), {
  loading: () => (
    <PortalLoadingState
      title="Loading companies"
      description="Preparing company cards and invite actions."
    />
  ),
});

export default function CompaniesPage() {
  return <Companies />;
}
