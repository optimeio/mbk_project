import LegacyPortalShell from '@/features/legacyPortal/LegacyPortalShell';
import LegacyCoursesPage from '@/features/legacyPortal/LegacyCoursesPage';

export const metadata = {
  title: 'Courses & Training Programs | MBK Technology Salem',
  description:
    'Explore top technical training courses at MBK Technology. We offer programs in Civil, Mechanical, AI, EV, and Software Engineering for students and professionals.',
  alternates: {
    canonical: 'https://mbktechnologies.info/courses',
  },
};

export default function CoursesPage() {
  return (
    <LegacyPortalShell>
      <LegacyCoursesPage />
    </LegacyPortalShell>
  );
}
