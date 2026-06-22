import dynamic from 'next/dynamic';

export const metadata = {
  title: 'Verify Email',
  description: 'Verify your email address to activate your MBK Carrierz account.',
};

const VerifyEmail = dynamic(
  () => import('@/features/auth/pages/VerifyEmail'));

export default function VerifyEmailPage() {
  return <VerifyEmail />;
}
