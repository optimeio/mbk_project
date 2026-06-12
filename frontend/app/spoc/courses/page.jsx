"use client";

import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

const SpocCourses = dynamic(() => import("@/portals/spoc/SpocCourses"), {
  loading: () => (
    <PortalLoadingState
      title="Loading courses"
      description="Fetching assigned courses and training materials."
    />
  ),
});

export default function SpocCoursesPage() {
  return <SpocCourses />;
}
