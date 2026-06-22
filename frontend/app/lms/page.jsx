import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

export const metadata = {
  title: 'Learning Hub',
  description: 'Access MBK Carrierz course catalog, learning modules, and training materials in the Learning Management System.',
};

const LearningHub = dynamic(() => import("@/features/lms/LearningHub"), {
  loading: () => (
    <PortalLoadingState
      title="Loading learning hub"
      description="Preparing course catalog."
    />
  ),
});

export default function LmsPage() {
  return <LearningHub />;
}
