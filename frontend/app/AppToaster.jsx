'use client';

import { Toaster } from 'react-hot-toast';

const TOAST_OPTIONS = {
  duration: 3600,
  style: {
    background: '#0f172a',
    color: '#f8fafc',
    border: '1px solid #1e293b',
    boxShadow: '0 12px 30px rgba(2, 6, 23, 0.35)',
  },
  success: {
    duration: 3000,
    style: {
      background: '#16a34a',
      color: '#ffffff',
      border: '1px solid #15803d',
    },
  },
  error: {
    duration: 4600,
    style: {
      background: '#dc2626',
      color: '#ffffff',
      border: '1px solid #b91c1c',
    },
  },
};

export default function AppToaster() {
  return (
    <Toaster
      position="top-right"
      gutter={10}
      containerStyle={{ top: 18, right: 18, zIndex: 99999 }}
      toastOptions={TOAST_OPTIONS}
    />
  );
}

