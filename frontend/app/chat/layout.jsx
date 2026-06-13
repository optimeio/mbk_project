"use client";

import PortalViewport from "@/components/common/PortalViewport";
import ProtectedRoute from "@/components/common/ProtectedRoute";

export default function ChatRouteLayout({ children }) {
  return (
    <ProtectedRoute
      allowedRoles={[
        "superadmin",
        "admin",
        "spocadmin",
        "collegeadmin",
        "trainer",
        "accountant",
        "student",
        "company",
        "companyadmin",
      ]}
    >
      <PortalViewport
        compact
        showTopbar={false}
        contentWrapperClassName="overflow-hidden"
        contentInnerClassName="h-full p-0 md:p-0"
      >
        {children}
      </PortalViewport>
    </ProtectedRoute>
  );
}
