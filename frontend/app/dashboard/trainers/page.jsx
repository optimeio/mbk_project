import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

export const metadata = {
  title: 'Manage Trainers',
  description: 'Manage trainer registrations, verifications, and assignments on the MBK Carrierz admin dashboard.',
};

const TrainerList = dynamic(() => import("@/portals/admin/TrainerList"), {
  loading: () => (
    <PortalLoadingState
      title="Loading trainer hub"
      description="Preparing queues, search, and verification actions."
    />
  ),
});

export default function TrainerListPage() {
  return <TrainerList />;
}
