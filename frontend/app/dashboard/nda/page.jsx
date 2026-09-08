import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

export const metadata = {
  title: 'NDA Management',
  description: 'Manage non-disclosure agreements, track signing status, and generate NDA documents on MBK Carrierz.',
};

const NdaManagement = dynamic(() => import("@/portals/admin/NdaManagement"), {
  loading: () => (
    <PortalLoadingState
      title="Loading NDA management"
      description="Preparing agreement status and document controls."
    />
  ),
});

export default function NdaManagementPage() {
  return <NdaManagement />;
}
