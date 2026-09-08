import AboutPageContent from '@/features/about/pages/AboutPage';

export const metadata = {
  title: 'About MBK Carrierz | Training, Operations & Workflow Platform',
  description:
    'Learn how MBK Carrierz connects courses, trainer operations, documentation, dashboard visibility, and institution-ready workflow delivery.',
  alternates: {
    canonical: 'https://mbktechnologies.info/about',
  },
};

export default function AboutPage() {
  return <AboutPageContent id="about" />;
}
