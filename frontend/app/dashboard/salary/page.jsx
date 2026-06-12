"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import PortalLoadingState from "@/components/common/PortalLoadingState";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SalaryCalculation = dynamic(() => import("@/portals/admin/SalaryCalculation"), {
  loading: () => (
    <PortalLoadingState
      title="Loading salary tools"
      description="Preparing payroll summaries and settlement flows."
    />
  ),
});

const FinancialReports = dynamic(() => import("@/portals/admin/FinancialReports"), {
  loading: () => (
    <PortalLoadingState
      title="Loading financial reports"
      description="Preparing report filters and financial summaries."
    />
  ),
});

const VIEW_SALARY = "salary";
const VIEW_FINANCIAL = "financial";
const VIEW_OPTIONS = [
  { label: "Salary", value: VIEW_SALARY },
  { label: "Financial", value: VIEW_FINANCIAL },
];

function SalaryManagementContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawView = searchParams.get("view");
  const activeView = rawView === VIEW_FINANCIAL ? VIEW_FINANCIAL : VIEW_SALARY;

  const handleViewChange = (nextView) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextView === VIEW_FINANCIAL) {
      params.set("view", VIEW_FINANCIAL);
    } else {
      params.delete("view");
    }

    const query = params.toString();
    const target = query ? `${pathname}?${query}` : pathname;
    router.replace(target);
  };

  return (
    <div className="space-y-4 p-6">
      <div className="text-sm text-muted-foreground">
        <Link href="/dashboard" className="font-semibold text-primary hover:underline">
          Dashboard
        </Link>
        <span className="mx-2 text-muted-foreground/70">/</span>
        <span>Salary Management System</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Salary Management System
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage salary processing and financial reports in one place.
          </p>
        </div>

        <div className="inline-flex rounded-lg border bg-card p-1 shadow-sm">
          {VIEW_OPTIONS.map((option) => {
            const isActive = activeView === option.value;

            return (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={isActive ? "default" : "ghost"}
                className={cn("min-w-24", !isActive && "text-muted-foreground")}
                onClick={() => handleViewChange(option.value)}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
      </div>

      {activeView === VIEW_FINANCIAL ? (
        <FinancialReports embedded />
      ) : (
        <SalaryCalculation embedded />
      )}
    </div>
  );
}

export default function SalaryCalculationPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading salary management...</div>}>
      <SalaryManagementContent />
    </Suspense>
  );
}
