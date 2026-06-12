"use client";

import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

const TrainerActivity = dynamic(() => import("@/portals/admin/TrainerActivity"), {
  loading: () => (
    <PortalLoadingState
      title="Loading trainer activity"
      description="Preparing attendance logs and report tools."
    />
  ),
});

export default function TrainerActivityPage() {
  return <TrainerActivity />;
}
