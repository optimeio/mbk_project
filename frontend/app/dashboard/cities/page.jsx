"use client";

import dynamic from "next/dynamic";

import PortalLoadingState from "@/components/common/PortalLoadingState";

const CityManagement = dynamic(() => import("@/portals/admin/CityManagement"), {
  loading: () => (
    <PortalLoadingState
      title="Loading city management"
      description="Preparing city assignments and roster coverage."
    />
  ),
});

export default function CityManagementPage() {
  return <CityManagement />;
}
