import LegacyPortalShell from '@/features/legacyPortal/LegacyPortalShell';
import LegacyServicesPage from '@/features/legacyPortal/LegacyServicesPage';

export const metadata = {
  title: 'Institutional Training & Deployment | MBK Technology Salem',
  description:
    'MBK Technology provides verified technical trainer deployment for colleges in Tamil Nadu, aligned with Naan Mudhalvan for Engineering and IT domains.',
  alternates: {
    canonical: 'https://mbktechnologies.info/services',
  },
};

export default function ServicesPage() {
  return (
    <LegacyPortalShell>
      <LegacyServicesPage />
    </LegacyPortalShell>
  );
}
