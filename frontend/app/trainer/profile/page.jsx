"use client";

import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

const TrainerProfile = dynamic(() => import("@/portals/trainer/TrainerProfile"), {
  loading: () => (
    <PortalLoadingState
      title="Loading Profile"
      description="Fetching your trainer profile and documents..."
    />
  ),
  ssr: false,
});

export default function TrainerProfilePage() {
  return <TrainerProfile />;
}
