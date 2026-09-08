import dynamic from 'next/dynamic';

export const metadata = {
  title: 'Student Forgot Password',
  description: 'Reset your MBK Carrierz student account password.',
};

const StudentForgotPassword = dynamic(
  () => import('@/features/auth/pages/StudentForgotPassword')
);

export default function StudentForgotPasswordPage() {
  return <StudentForgotPassword />;
}
