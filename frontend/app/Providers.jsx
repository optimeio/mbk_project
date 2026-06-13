"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { installClientRuntimeGuards } from "@/lib/runtimeGuards";
import { AuthProvider } from "@/context/AuthContext";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import AppToaster from "./AppToaster";
import QueryProvider from "./QueryProvider";
import AppShell from "./AppShell";

if (typeof window !== "undefined") {
  installClientRuntimeGuards();
}

const PortalDataProvider = dynamic(
  () => import("@/context/PortalDataContext").then((mod) => mod.PortalDataProvider),
  { ssr: false },
);

export default function Providers({ children }) {
  useEffect(() => {
    installClientRuntimeGuards();
  }, []);

  return (
    <QueryProvider>
      <ErrorBoundary>
        <AuthProvider>
          <AppToaster />
          <AppShell portalDataProvider={PortalDataProvider}>{children}</AppShell>
        </AuthProvider>
      </ErrorBoundary>
    </QueryProvider>
  );
}
