"use client";

import { SocketProvider } from '@/context/SocketContext';

export default function HeavyProviders({ children }) {
  return (
    <SocketProvider>{children}</SocketProvider>
  );
}
