"use client";

import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

const AccountantReports = dynamic(
  () => import("@/portals/accountant/AccountantReports"),
  { loading: () => <PortalLoadingState title="Loading reports" description="Building financial analytics and trend data." /> }
);

export default function AccountantReportsPage() {
  return <AccountantReports />;
}
