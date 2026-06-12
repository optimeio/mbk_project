"use client";

import dynamic from "next/dynamic";

import PortalLoadingState from "@/components/common/PortalLoadingState";

const StudentProfile = dynamic(() => import("@/portals/student/StudentProfile"), {
  loading: () => (
    <PortalLoadingState title="Loading profile" description="Fetching your profile." />
  ),
});

export default function StudentProfilePage() {
  return <StudentProfile />;
}
