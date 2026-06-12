"use client";

import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

const CourseColleges = dynamic(() => import("@/portals/admin/CourseColleges"), {
  loading: () => (
    <PortalLoadingState
      title="Loading colleges"
      description="Fetching college hierarchy, departments, and course mappings."
    />
  ),
});

export default function CollegesPage() {
  return <CourseColleges />;
}
