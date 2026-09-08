import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

export const metadata = {
  title: 'Trainer Activity',
  description: 'Monitor trainer daily activities, attendance logs, and report tools on the MBK Carrierz admin dashboard.',
};

const TrainerActivity = dynamic(() => import("@/portals/admin/TrainerActivity"), {
  loading: () => (
    <PortalLoadingState
      title="Loading trainer activity"
      description="Preparing attendance logs and report tools."
    />
  ),
});

export default function TrainerActivityPage() {
  return <TrainerActivity />;
}
