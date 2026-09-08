import dynamic from 'next/dynamic';

export const metadata = {
  title: 'Verify Account',
  description: 'Complete your MBK Carrierz account verification to access all platform features.',
};

const VerifyAccount = dynamic(
  () => import('@/features/auth/pages/VerifyAccount'));

export default function VerifyAccountPage() {
  return <VerifyAccount />;
}
