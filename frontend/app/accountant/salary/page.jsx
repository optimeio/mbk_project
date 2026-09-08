"use client";

import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

const AccountantSalaryReview = dynamic(
  () => import("@/portals/accountant/AccountantSalaryReview"),
  {
    loading: () => (
      <PortalLoadingState
        title="Loading salary review"
        description="Fetching trainer salaries and pending approvals."
      />
    ),
  }
);

export default function AccountantSalaryPage() {
  return <AccountantSalaryReview />;
}
