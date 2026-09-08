import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

export const metadata = {
  title: 'Trainer Settings',
  description: 'Manage your trainer account settings, notifications, and preferences on MBK Carrierz.',
};

const TrainerSettings = dynamic(
  () => import("@/portals/trainer/TrainerSettings"),
  {
      loading: () => (
      <PortalLoadingState
        title="Loading settings"
        description="Preparing your account settings."
      />
    ),
  }
);

export default function TrainerSettingsPage() {
  return <TrainerSettings />;
}
