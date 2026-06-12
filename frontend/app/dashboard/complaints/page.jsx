"use client";

import dynamic from "next/dynamic";

import PortalLoadingState from "@/components/common/PortalLoadingState";

const ComplaintList = dynamic(() => import("@/portals/admin/ComplaintList"), {
  loading: () => (
    <PortalLoadingState
      title="Loading complaints"
      description="Preparing complaint queues and status controls."
    />
  ),
});

export default function ComplaintsPage() {
  return <ComplaintList />;
}
