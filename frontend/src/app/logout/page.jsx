// File: c:/mbk_project/frontend/src/app/logout/page.jsx

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LogoutPage() {
  const router = useRouter();
  const { logout } = useAuth();

  useEffect(() => {
    const performLogout = async () => {
      try {
        await logout();
        // After successful logout, redirect to home page
        router.replace('/');
      } catch (err) {
        console.error('Logout failed:', err);
        // Still navigate home to avoid stuck state
        router.replace('/');
      }
    };
    performLogout();
  }, [logout, router]);

  return null; // No UI needed
}
