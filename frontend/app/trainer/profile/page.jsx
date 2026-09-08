import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

export const metadata = {
  title: 'Trainer Profile',
  description: 'Manage your trainer profile, qualifications, documents, and account settings on MBK Carrierz.',
};

const TrainerProfile = dynamic(() => import("@/portals/trainer/TrainerProfile"), {
  loading: () => (
    <PortalLoadingState
      title="Loading Profile"
      description="Fetching your trainer profile and documents..."
    />
  ),
});

export default function TrainerProfilePage() {
  return <TrainerProfile />;
}
