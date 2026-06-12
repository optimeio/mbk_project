"use client";

import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

const CollegeDepartments = dynamic(
  () => import("@/portals/admin/CollegeDepartments"),
  {
    loading: () => (
      <PortalLoadingState
        title="Loading courses"
        description="Fetching course hierarchy and department mappings."
      />
    ),
  }
);

export default function CoursesPage() {
  return <CollegeDepartments />;
}
