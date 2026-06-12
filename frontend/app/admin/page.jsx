import LegacyPortalShell from '@/features/legacyPortal/LegacyPortalShell';
import LegacyAdminDashboardPage from '@/features/legacyPortal/LegacyAdminDashboardPage';

export const metadata = {
  title: 'Admin Dashboard | MBK Technology',
  description: 'Legacy MBK admin dashboard page.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return (
    <LegacyPortalShell>
      <LegacyAdminDashboardPage />
    </LegacyPortalShell>
  );
}
