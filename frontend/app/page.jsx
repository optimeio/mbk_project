"use client";

import { use } from 'react';
import LandingPage from '@/features/auth/pages/LandingPage';

export default function Home({ searchParams }) {
  // Read dynamically. When prerendering, this won't block build
  let initialLoginOpen = false;
  try {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      initialLoginOpen = urlParams.get('login') === 'true';
    }
  } catch (e) {}

  return <LandingPage initialLoginOpen={initialLoginOpen} />;
}

