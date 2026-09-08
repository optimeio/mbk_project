import PortalLoadingState from "@/components/common/PortalLoadingState";

export default function TrainerProfileLoading() {
  return (
    <PortalLoadingState
      title="Loading Profile"
      description="Fetching your trainer profile and documents..."
    />
  );
}

