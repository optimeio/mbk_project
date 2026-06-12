"use client";

import dynamic from "next/dynamic";

import PortalLoadingState from "@/components/common/PortalLoadingState";

const TrainerList = dynamic(() => import("@/portals/admin/TrainerList"), {
  loading: () => (
    <PortalLoadingState
      title="Loading trainer hub"
      description="Preparing queues, search, and verification actions."
    />
  ),
});

export default function TrainerListPage() {
  return <TrainerList />;
}
