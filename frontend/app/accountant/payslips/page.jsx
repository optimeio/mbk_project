"use client";

import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

const AccountantPayslips = dynamic(
  () => import("@/portals/accountant/AccountantPayslips"),
  {
    loading: () => (
      <PortalLoadingState
        title="Loading payslips"
        description="Fetching trainer payslips and download links."
      />
    ),
  }
);

export default function AccountantPayslipsPage() {
  return <AccountantPayslips />;
}
