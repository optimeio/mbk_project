"use client";

import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";
import MobileTrainerLayout from "@/app/layouts/MobileTrainerLayout";

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
  return (
    <MobileTrainerLayout>
      <TrainerComplaints />
    </MobileTrainerLayout>
  );
}
