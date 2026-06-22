import { Suspense } from 'react';
import dynamic from 'next/dynamic';

export const metadata = {
  title: 'Sign Up',
  description: 'Create your MBK Carrierz account to start your professional training journey. Register as a student, trainer, or company partner.',
};

const SignUpClient = dynamic(() => import('@/features/auth/pages/SignUp'), { });

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-orange-50/20">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="text-sm text-gray-500 font-medium">Loading signup form...</p>
        </div>
      </div>
    }>
      <SignUpClient />
    </Suspense>
  );
}
