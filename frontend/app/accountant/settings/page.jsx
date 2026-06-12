"use client";

import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

const AccountantSettings = dynamic(
  () => import("@/portals/accountant/AccountantSettings"),
  { loading: () => <PortalLoadingState title="Loading settings" description="Preparing account configuration." /> }
);

export default function AccountantSettingsPage() {
  return <AccountantSettings />;
}
