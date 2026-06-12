"use client";

import dynamic from "next/dynamic";

import PortalLoadingState from "@/components/common/PortalLoadingState";

const GeoTagVerification = dynamic(
  () => import("@/portals/spoc/GeoTagVerification"),
  {
    loading: () => (
      <PortalLoadingState
        title="Loading geo verification"
        description="Preparing geo-tag evidence review tools."
      />
    ),
  },
);

export default function GeoVerificationPage() {
  return <GeoTagVerification />;
}
