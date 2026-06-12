"use client";

import {
  Building2,
  GraduationCap,
  CircleCheckBig,
  Clock3,
  IndianRupee,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { useMemo } from "react";

import ActivityPanel from "@/components/admin/ActivityPanel";
import PortalLoadingState from "@/components/common/PortalLoadingState";
import QuickActions from "@/components/admin/QuickActions";
import StatCard from "@/components/admin/StatCard";
import { usePortalData } from "@/context/PortalDataContext";
import { useSuperAdminDashboardQuery } from "@/hooks/queries/useDashboardQueries";

const normalizeLabel = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const buildStats = (rawStats = []) => {
  const getValue = (aliases = [], fallback = "0") => {
    const match = aliases
      .map((alias) =>
        rawStats.find(
          (item) =>
            normalizeLabel(item?.title || item?.name) === normalizeLabel(alias),
        ),
      )
      .find(Boolean);

    const value = match?.value ?? match?.stat ?? fallback;
    return String(value ?? fallback);
  };

  const salaryValue = getValue(["Salary Due Summary"], "Rs 0")
    .replace(/\u20B9/g, "Rs ")
    .replace(/^Rs\s*Rs\s*/i, "Rs ");

  return [
    { title: "Total Companies", value: getValue(["Total Companies"]), icon: Building2, tone: "indigo" },
    { title: "Total Colleges", value: getValue(["Total Colleges"]), icon: GraduationCap, tone: "sky" },
    { title: "Total Trainers", value: getValue(["Total Trainers"]), icon: Users, tone: "emerald" },
    { title: "Active Trainers Today", value: getValue(["Active Trainers Today"]), icon: UserRoundCheck, tone: "amber" },
    {
      title: "Present / Absent",
      value: getValue(
        ["Present / Absent", "Present / Absent Count", "Attendance Summary"],
        "0 / 0",
      ),
      icon: CircleCheckBig,
      tone: "indigo",
    },
    { title: "Pending Approvals", value: getValue(["Pending Approvals"]), icon: Clock3, tone: "rose" },
    { title: "Salary Due Summary", value: salaryValue || "Rs 0", icon: IndianRupee, tone: "slate" },
  ];
};

const buildActivity = (rawActivities = []) => {
  if (!Array.isArray(rawActivities) || rawActivities.length === 0) {
    return [
      {
        id: "fallback-1",
        user: "System",
        action: "No recent trainer activity",
        time: "Just now",
      },
    ];
  }

  return rawActivities.map((item, index) => ({
    id: item?.id || item?._id || `activity-${index}`,
    user: item?.user || "System",
    action: item?.action || item?.content || "No recent activity",
    time: item?.time || item?.date || "Just now",
  }));
};

const DashboardPage = () => {
  const { dashboardData, portalRole, portalLoading } = usePortalData((state) => ({
    dashboardData: state.dashboardData,
    portalRole: state.portalRole,
    portalLoading: state.loading,
  }));

  const portalDashboard =
    portalRole === "SuperAdmin" && dashboardData ? dashboardData : null;

  const shouldFetchFallbackDashboard = !portalLoading && !portalDashboard?.stats;
  const superAdminDashboardQuery = useSuperAdminDashboardQuery({
    enabled: shouldFetchFallbackDashboard,
  });

  const fallbackDashboard = superAdminDashboardQuery.data || null;

  const stats = useMemo(() => {
    if (portalDashboard?.stats) {
      return buildStats(portalDashboard.stats);
    }

    return buildStats(fallbackDashboard?.stats || []);
  }, [fallbackDashboard?.stats, portalDashboard?.stats]);

  const activity = useMemo(() => {
    if (portalDashboard) {
      return buildActivity(
        portalDashboard.recentActivity ||
          portalDashboard.recentActivity ||
          portalDashboard.activities ||
          [],
      );
    }

    return buildActivity(
      fallbackDashboard?.recentActivity ||
        fallbackDashboard?.recentActivity ||
        fallbackDashboard?.activities ||
        [],
    );
  }, [fallbackDashboard, portalDashboard]);

  const showSkeleton =
    !portalDashboard?.stats &&
    (portalLoading ||
      (shouldFetchFallbackDashboard &&
        superAdminDashboardQuery.isPending &&
        !fallbackDashboard));

  if (showSkeleton) {
    return (
      <PortalLoadingState
        title="Loading dashboard"
        description="Preparing your admin overview and recent activity."
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item, index) => (
          <StatCard
            key={item.title}
            title={item.title}
            value={item.value}
            icon={item.icon}
            tone={item.tone}
            index={index}
          />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-1">
          <QuickActions />
        </div>
        <div className="xl:col-span-2">
          <ActivityPanel activities={activity} />
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
