import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

export const metadata = {
  title: 'Trainer Payslips',
  description: 'View and download your monthly salary slips and payment history on MBK Carrierz.',
};

const TrainerPaySlips = dynamic(
  () => import("@/portals/trainer/TrainerPaySlips"),
  {
      loading: () => (
      <PortalLoadingState
        title="Loading payslips"
        description="Fetching your monthly salary slips."
      />
    ),
  }
);

export default function TrainerPayslipsPage() {
  return <TrainerPaySlips />;
}
