"use client";

import dynamic from "next/dynamic";

import PortalLoadingState from "@/components/common/PortalLoadingState";

const StudentCourses = dynamic(() => import("@/portals/student/StudentCourses"), {
  loading: () => (
    <PortalLoadingState title="Loading courses" description="Fetching training programs." />
  ),
});

export default function StudentCoursesPage() {
  return <StudentCourses />;
}
