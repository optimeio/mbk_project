import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

export const metadata = {
  title: 'Courses Management',
  description: 'Manage course catalog, hierarchy, assignments, and training statistics on MBK Carrierz.',
};

const AllCoursesList = dynamic(
  () => import("@/portals/admin/AllCoursesList"),
  {
      loading: () => (
      <PortalLoadingState
        title="Loading courses"
        description="Fetching course hierarchy and statistics."
      />
    ),
  }
);

export default function CoursesPage() {
  return <AllCoursesList />;
}
