"use client";

import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

const SpocColleges = dynamic(() => import("@/portals/spoc/SpocColleges"), {
  loading: () => (
    <PortalLoadingState
      title="Loading Colleges"
      description="Fetching college data..."
    />
  ),
});

export default function SpocCollegesPage() {
  return <SpocColleges />;
}
