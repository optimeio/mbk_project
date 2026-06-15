"use client";

import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

const AllCoursesList = dynamic(
  () => import("@/portals/admin/AllCoursesList"),
  {
    loading: () => (
      <PortalLoadingState
        title="Loading courses"
        description="Fetching course hierarchy and statistics."
      />
    ),
  }
);

export default function CoursesPage() {
  return <AllCoursesList />;
}
