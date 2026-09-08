"use client";

import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

const SpocSettings = dynamic(
  () => import("@/portals/spoc/SpocSettings"),
  { loading: () => <PortalLoadingState title="Loading settings" description="Preparing SPOC account configuration." /> }
);

export default function SpocSettingsPage() {
  return <SpocSettings />;
}
