"use client";

import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

const AccountantBankDetails = dynamic(
  () => import("@/portals/accountant/AccountantBankDetails"),
  { loading: () => <PortalLoadingState title="Loading bank details" description="Fetching trainer banking information." /> }
);

export default function AccountantBankDetailsPage() {
  return <AccountantBankDetails />;
}
