"use client";

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import LandingPage from '@/features/auth/pages/LandingPage';

function HomeContent() {
  const searchParams = useSearchParams();
  const initialLoginOpen = searchParams?.get('login') === 'true';

  return <LandingPage initialLoginOpen={initialLoginOpen} />;
}

export default function Home() {
  return (
    <Suspense fallback={<LandingPage initialLoginOpen={false} />}>
      <HomeContent />
    </Suspense>
  );
}

