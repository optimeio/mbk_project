"use client";

import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

const ComplaintList = dynamic(() => import("@/portals/admin/ComplaintList"), {
  loading: () => (
    <PortalLoadingState
      title="Loading Complaints"
      description="Fetching complaint records..."
    />
  ),
});

export default function SpocComplaintsPage() {
  return <ComplaintList />;
}
