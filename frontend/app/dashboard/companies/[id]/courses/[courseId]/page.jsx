"use client";

import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

const CourseColleges = dynamic(() => import("@/portals/admin/CourseColleges"), {
  loading: () => (
    <PortalLoadingState
      title="Loading colleges"
      description="Fetching colleges associated with this course and company."
    />
  ),
});

export default function CourseCollegesPage() {
  return <CourseColleges />;
}
