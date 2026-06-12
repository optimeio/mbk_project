"use client";

import dynamic from "next/dynamic";

import PortalLoadingState from "@/components/common/PortalLoadingState";

const SpocTrainers = dynamic(() => import("@/portals/spoc/SpocTrainers"), {
  loading: () => (
    <PortalLoadingState
      title="Loading SPOC trainers"
      description="Preparing trainer roster and attendance metrics."
    />
  ),
});

export default function SpocTrainersPage() {
  return <SpocTrainers />;
}
