"use client";

import dynamic from "next/dynamic";

import PortalLoadingState from "@/components/common/PortalLoadingState";

const TrainerDocuments = dynamic(() => import("@/portals/admin/TrainerDocuments"), {
  loading: () => (
    <PortalLoadingState
      title="Loading document workspace"
      description="Preparing trainer records and verification tools."
    />
  ),
});

export default function TrainerDocumentsPage() {
  return <TrainerDocuments />;
}
