import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

export const metadata = {
  title: 'Trainer Documents',
  description: 'Review and verify trainer documents, certifications, and qualification records on MBK Carrierz.',
};

const TrainerDocuments = dynamic(() => import("@/portals/admin/TrainerDocuments"), {
  loading: () => (
    <PortalLoadingState
      title="Loading document workspace"
      description="Preparing trainer records and verification tools."
    />
  ),
});

export default function TrainerDocumentsPage() {
  return <TrainerDocuments />;
}
