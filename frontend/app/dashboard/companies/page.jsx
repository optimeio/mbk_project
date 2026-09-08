import { Suspense } from "react";
import PortalLoadingState from "@/components/common/PortalLoadingState";
import CompaniesView from "./CompaniesView";

export const metadata = {
  title: "Company Management",
  description: "Manage partner companies, invitations, and placement collaborations on MBK Carrierz.",
};

export default function CompaniesPage() {
  return (
    <Suspense
      fallback={
        <PortalLoadingState
          title="Loading companies"
          description="Preparing company cards and invite actions."
        />
      }
    >
      <CompaniesView />
    </Suspense>
  );
}
