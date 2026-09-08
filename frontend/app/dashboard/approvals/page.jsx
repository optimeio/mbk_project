import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

export const metadata = {
  title: 'Pending Approvals',
  description: 'Review and approve pending trainer registrations and applications on MBK Carrierz.',
};

const PendingApprovals = dynamic(
  () => import("@/portals/admin/PendingApprovals"),
  {
      loading: () => (
      <PortalLoadingState
        title="Loading pending approvals"
        description="Fetching trainer applications awaiting review."
      />
    ),
  }
);

export default function ApprovalsPage() {
  return <PendingApprovals />;
}
