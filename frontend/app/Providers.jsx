"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { installClientRuntimeGuards } from "@/lib/runtimeGuards";
import { setupGlobalErrorHandlers } from "@/lib/globalErrorHandlers";
import { AuthProvider } from "@/context/AuthContext";
import GlobalErrorBoundary from "@/components/layout/GlobalErrorBoundary";
import GlobalLoadingIndicator from "@/components/layout/GlobalLoadingIndicator";
import AppToaster from "./AppToaster";
import QueryProvider from "./QueryProvider";
import AppShell from "./AppShell";

if (typeof window !== "undefined") {
  installClientRuntimeGuards();
  setupGlobalErrorHandlers();
}

const PortalDataProvider = dynamic(
  () => import("@/context/PortalDataContext").then((mod) => mod.PortalDataProvider),
  { ssr: false },
);

export default function Providers({ children }) {
  useEffect(() => {
    installClientRuntimeGuards();
    setupGlobalErrorHandlers();
  }, []);

  return (
    <QueryProvider>
      <GlobalErrorBoundary>
        <AuthProvider>
          <AppToaster />
          <GlobalLoadingIndicator />
          <AppShell portalDataProvider={PortalDataProvider}>{children}</AppShell>
        </AuthProvider>
      </GlobalErrorBoundary>
    </QueryProvider>
  );
}
