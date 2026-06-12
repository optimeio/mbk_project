"use client";

import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

const TrainerProfileAdmin = dynamic(() => import("@/portals/admin/TrainerProfile"), {
  loading: () => (
    <PortalLoadingState
      title="Loading trainer profile"
      description="Fetching trainer documents, attendance, and financial records."
    />
  ),
});

export default function TrainerProfileAdminPage() {
  return <TrainerProfileAdmin />;
}
