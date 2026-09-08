import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

export const metadata = {
  title: 'Student Courses',
  description: 'Browse and access your enrolled training programs and course materials on MBK Carrierz.',
};

const StudentCourses = dynamic(() => import("@/portals/student/StudentCourses"), {
  loading: () => (
    <PortalLoadingState title="Loading courses" description="Fetching training programs." />
  ),
});

export default function StudentCoursesPage() {
  return <StudentCourses />;
}
