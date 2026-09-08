import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

export const metadata = {
  title: 'SPOC Schedule',
  description: 'Manage training schedules, trainer availability, and session calendar on MBK Carrierz.',
};

const Scheduler = dynamic(() => import("@/portals/spoc/Scheduler"), {
  loading: () => (
    <PortalLoadingState
      title="Initializing scheduler"
      description="Optimizing session views, trainer availability, and calendar resources. Please wait."
    />
  ),
});

export default function SpocSchedulePage() {
  return <Scheduler />;
}
