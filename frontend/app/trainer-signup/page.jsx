import dynamic from 'next/dynamic';

export const metadata = {
  title: 'Trainer Registration',
  description: 'Join MBK Carrierz as a professional trainer. Complete your registration to start training students and building your career.',
};

const TrainerRegistration = dynamic(
  () => import('@/features/auth/pages/TrainerRegistration'));

export default function TrainerSignupPage() {
  return <TrainerRegistration />;
}
