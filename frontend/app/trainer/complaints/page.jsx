import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

export const metadata = {
  title: 'Trainer Complaints',
  description: 'Submit and track your complaints, issues, and feedback on the MBK Carrierz platform.',
};

const TrainerComplaints = dynamic(
  () => import("@/portals/trainer/TrainerComplaints"),
  {
      loading: () => (
      <PortalLoadingState
        title="Loading Complaints"
        description="Fetching your complaint submissions..."
      />
    ),
  }
);

export default function TrainerComplaintsPage() {
  return <TrainerComplaints />;
}
