"use client";

import dynamic from "next/dynamic";

import PortalLoadingState from "@/components/common/PortalLoadingState";

const LearningHub = dynamic(() => import("@/features/lms/LearningHub"), {
  loading: () => (
    <PortalLoadingState
      title="Loading learning hub"
      description="Preparing course catalog."
    />
  ),
});

export default function LmsPage() {
  return <LearningHub />;
}
