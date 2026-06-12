"use client";

import dynamic from "next/dynamic";

import PortalLoadingState from "@/components/common/PortalLoadingState";

const NdaManagement = dynamic(() => import("@/portals/admin/NdaManagement"), {
  loading: () => (
    <PortalLoadingState
      title="Loading NDA management"
      description="Preparing agreement status and document controls."
    />
  ),
});

export default function NdaManagementPage() {
  return <NdaManagement />;
}
