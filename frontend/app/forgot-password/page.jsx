import dynamic from 'next/dynamic';

export const metadata = {
  title: 'Forgot Password',
  description: 'Reset your MBK Carrierz account password. Enter your email to receive a password reset link.',
};

const ForgotPasswordClient = dynamic(
  () => import('@/features/auth/pages/ForgotPassword'));

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
