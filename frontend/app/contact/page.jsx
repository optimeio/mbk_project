import LegacyPortalShell from '@/features/legacyPortal/LegacyPortalShell';
import LegacyContactPage from '@/features/legacyPortal/LegacyContactPage';

export const metadata = {
  title: 'Contact Us | MBK Technology Salem',
  description:
    'Get in touch with MBK Technology for admissions, corporate training, or institutional trainer deployment in Salem. Available via WhatsApp, phone, and email.',
  alternates: {
    canonical: 'https://mbktechnologies.info/contact',
  },
};

export default function ContactPage() {
  return (
    <LegacyPortalShell>
      <LegacyContactPage />
    </LegacyPortalShell>
  );
}
