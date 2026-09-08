import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

export const metadata = {
  title: 'Student Profile',
  description: 'View and manage your student profile, personal information, and enrollment details on MBK Carrierz.',
};

const StudentProfile = dynamic(() => import("@/portals/student/StudentProfile"), {
  loading: () => (
    <PortalLoadingState title="Loading profile" description="Fetching your profile." />
  ),
});

export default function StudentProfilePage() {
  return <StudentProfile />;
}
