import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

export const metadata = {
  title: 'City Management',
  description: 'Manage city assignments, trainer coverage areas, and location-based scheduling on MBK Carrierz.',
};

const CityManagement = dynamic(() => import("@/portals/admin/CityManagement"), {
  loading: () => (
    <PortalLoadingState
      title="Loading city management"
      description="Preparing city assignments and roster coverage."
    />
  ),
});

export default function CityManagementPage() {
  return <CityManagement />;
}
