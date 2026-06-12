"use client";

import dynamic from "next/dynamic";
import AntdProviders from "../../AntdProviders";
import PortalLoadingState from "@/components/common/PortalLoadingState";

const TrainerSchedule = dynamic(
  () => import("@/portals/trainer/TrainerSchedule"),
  {
    loading: () => (
      <PortalLoadingState
        title="Loading Schedule"
        description="Fetching your training calendar..."
      />
    ),
  }
);

export default function TrainerScheduleClient({ initialSelectedMonth }) {
  return (
    <AntdProviders>
      <TrainerSchedule initialSelectedMonth={initialSelectedMonth} />
    </AntdProviders>
  );
}
