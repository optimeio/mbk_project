"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import PortalLoadingState from "@/components/common/PortalLoadingState";

const Companies = dynamic(() => import("@/portals/admin/Companies"), {
  loading: () => (
    <PortalLoadingState
      title="Loading companies"
      description="Preparing company cards and invite actions."
    />
  ),
});

const CompanyDetails = dynamic(() => import("@/portals/admin/CompanyDetails"), {
  loading: () => (
    <PortalLoadingState
      title="Loading company details"
      description="Fetching company profile, courses, and invite data."
    />
  ),
});

export default function CompaniesView() {
  const searchParams = useSearchParams();
  const companyId = useMemo(() => {
    const qId = searchParams?.get("id") || searchParams?.get("companyId");
    if (qId) return qId;
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlId = urlParams.get("id") || urlParams.get("companyId");
      if (urlId) return urlId;
    }
    return null;
  }, [searchParams]);

  if (companyId) {
    return <CompanyDetails companyId={companyId} />;
  }

  return <Companies />;
}
