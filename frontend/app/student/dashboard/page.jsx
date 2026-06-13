"use client";

import dynamic from "next/dynamic";

import PortalLoadingState from "@/components/common/PortalLoadingState";

const StudentDashboard = dynamic(() => import("@/portals/student/StudentDashboard"), {
  loading: () => (
    <PortalLoadingState title="Loading dashboard" description="Preparing your student overview." />
  ),
});

export default function StudentDashboardPage() {
  return <StudentDashboard />;
}
