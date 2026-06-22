import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

export const metadata = {
  title: 'College Management',
  description: 'Manage colleges, departments, and course mappings on the MBK Carrierz admin dashboard.',
};

const CourseColleges = dynamic(() => import("@/portals/admin/CourseColleges"), {
  loading: () => (
    <PortalLoadingState
      title="Loading colleges"
      description="Fetching college hierarchy, departments, and course mappings."
    />
  ),
});

export default function CollegesPage() {
  return <CourseColleges />;
}
