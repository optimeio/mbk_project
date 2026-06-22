import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

export const metadata = {
  title: 'Student Dashboard',
  description: 'Access your student dashboard with course progress, attendance records, and learning activities on MBK Carrierz.',
};

const StudentDashboard = dynamic(() => import("@/portals/student/StudentDashboard"), {
  loading: () => (
    <PortalLoadingState title="Loading dashboard" description="Preparing your student overview." />
  ),
});

export default function StudentDashboardPage() {
  return <StudentDashboard />;
}
