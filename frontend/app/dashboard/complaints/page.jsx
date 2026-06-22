import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

export const metadata = {
  title: 'Complaints Management',
  description: 'Review and manage complaint submissions, escalations, and resolution status on MBK Carrierz.',
};

const ComplaintList = dynamic(() => import("@/portals/admin/ComplaintList"), {
  loading: () => (
    <PortalLoadingState
      title="Loading complaints"
      description="Preparing complaint queues and status controls."
    />
  ),
});

export default function ComplaintsPage() {
  return <ComplaintList />;
}
