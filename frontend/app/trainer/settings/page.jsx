"use client";

import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

const TrainerSettings = dynamic(
  () => import("@/portals/trainer/TrainerSettings"),
  { loading: () => <PortalLoadingState title="Loading settings" description="Preparing your account settings." /> }
);

export default function TrainerSettingsPage() {
  return <TrainerSettings />;
}
