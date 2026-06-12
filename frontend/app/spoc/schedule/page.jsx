"use client";

import dynamic from "next/dynamic";

import PortalLoadingState from "@/components/common/PortalLoadingState";

const Scheduler = dynamic(() => import("@/portals/spoc/Scheduler"), {
  loading: () => (
    <PortalLoadingState
      title="Initializing scheduler"
      description="Optimizing session views, trainer availability, and calendar resources. Please wait."
    />
  ),
  ssr: false,
});

export default function SpocSchedulePage() {
  return <Scheduler />;
}
