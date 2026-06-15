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
        // After successful logout, redirect to login page
        router.replace('/login');
      } catch (err) {
        console.error('Logout failed:', err);
        // Still navigate to login to avoid stuck state
        router.replace('/login');
      }
    };
    performLogout();
  }, [logout, router]);

  return null; // No UI needed
}
