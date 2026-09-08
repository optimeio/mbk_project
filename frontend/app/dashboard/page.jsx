import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

export const metadata = {
  title: 'Admin Dashboard',
  description: 'MBK Carrierz admin dashboard — manage trainers, students, courses, attendance, and platform analytics.',
};

const DashboardPage = dynamic(() => import("@/portals/admin/DashboardPage"), {
  loading: () => (
    <PortalLoadingState
      title="Loading dashboard"
      description="Preparing your admin overview and recent activity."
    />
  ),
});

export default function AdminDashboardPage() {
  return <DashboardPage />;
}
