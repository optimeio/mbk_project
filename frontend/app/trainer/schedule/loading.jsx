import PortalLoadingState from "@/components/common/PortalLoadingState";

export default function Loading() {
  return (
    <PortalLoadingState
      title="Loading Schedule"
      description="Fetching your training calendar..."
    />
  );
}
