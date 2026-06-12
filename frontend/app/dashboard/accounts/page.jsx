"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import PortalLoadingState from "@/components/common/PortalLoadingState";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SystemAccounts = dynamic(() => import("@/portals/admin/SystemAccounts"), {
  loading: () => (
    <PortalLoadingState
      title="Loading accounts"
      description="Preparing user account tools and permissions."
    />
  ),
});

const ActivityLogs = dynamic(() => import("@/portals/admin/ActivityLogs"), {
  loading: () => (
    <PortalLoadingState
      title="Loading activity logs"
      description="Preparing audit events and account history."
    />
  ),
});

const VIEW_ACCOUNTS = "accounts";
const VIEW_ACTIVITY = "activity";
const VIEW_OPTIONS = [
  { label: "Accounts", value: VIEW_ACCOUNTS },
  { label: "Activity", value: VIEW_ACTIVITY },
];

function AccountManagementContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawView = searchParams.get("view");
  const activeView = rawView === VIEW_ACTIVITY ? VIEW_ACTIVITY : VIEW_ACCOUNTS;

  const handleViewChange = (nextView) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextView === VIEW_ACTIVITY) {
      params.set("view", VIEW_ACTIVITY);
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
        <span>Account Management</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Account Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage user accounts and activity logs in one place.
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

      {activeView === VIEW_ACTIVITY ? (
        <ActivityLogs embedded />
      ) : (
        <SystemAccounts embedded />
      )}
    </div>
  );
}

export default function SystemAccountsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading account management...</div>}>
      <AccountManagementContent />
    </Suspense>
  );
}
