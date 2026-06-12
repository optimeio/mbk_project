"use client";

import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

const AccountantStatements = dynamic(
  () => import("@/portals/accountant/AccountantStatements"),
  {
    loading: () => (
      <PortalLoadingState
        title="Loading statements"
        description="Preparing monthly financial statements."
      />
    ),
  }
);

export default function AccountantStatementsPage() {
  return <AccountantStatements />;
}
