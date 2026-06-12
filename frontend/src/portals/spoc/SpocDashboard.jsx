"use client";

import AcademicCapIcon from "@heroicons/react/24/outline/AcademicCapIcon";
import BuildingLibraryIcon from "@heroicons/react/24/outline/BuildingLibraryIcon";
import BuildingOfficeIcon from "@heroicons/react/24/outline/BuildingOfficeIcon";
import ClipboardDocumentCheckIcon from "@heroicons/react/24/outline/ClipboardDocumentCheckIcon";
import ClockIcon from "@heroicons/react/24/outline/ClockIcon";
import ArrowPathIcon from "@heroicons/react/24/outline/ArrowPathIcon";
import UserGroupIcon from "@heroicons/react/24/outline/UserGroupIcon";
import { useEffect, useMemo, useState } from "react";

import PortalLoadingState from "@/components/common/PortalLoadingState";
import { usePortalData } from "@/context/PortalDataContext";
import { useSpocDashboardQuery } from "@/hooks/queries/useDashboardQueries";

const DEFAULT_STATS = [
  { name: "Today Trainers", stat: "0", icon: UserGroupIcon, color: "bg-blue-500" },
  { name: "Companies", stat: "0", icon: BuildingOfficeIcon, color: "bg-indigo-500" },
  { name: "Colleges", stat: "0", icon: BuildingLibraryIcon, color: "bg-purple-500" },
  { name: "Pending Verifications", stat: "0", icon: ClipboardDocumentCheckIcon, color: "bg-orange-500" },
  { name: "Attendance Summary", stat: "0/0", icon: ClockIcon, color: "bg-green-500" },
];

const unwrapApiPayload = (response) => {
  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    typeof response.data !== "undefined" &&
    typeof response.success === "undefined"
  ) {
    return response.data;
  }

  return response;
};

const unwrapApiList = (response) => {
  const payload = unwrapApiPayload(response);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const getCurrentTimeLabel = (dateValue = new Date()) =>
  new Date(dateValue).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

const buildStatsFromBundle = (resourceMap = {}, dashboardData = null) => {
  const liveDataResponse = resourceMap["/schedules/live-dashboard"];
  const associationsResponse = resourceMap["/schedules/associations/all"];

  if (liveDataResponse || associationsResponse) {
    const liveSchedules = unwrapApiList(liveDataResponse);
    const uniqueTrainers = new Set(
      liveSchedules.map((schedule) => schedule.trainerId?._id).filter(Boolean),
    );
    const presentCount = liveSchedules.filter(
      (schedule) => schedule.liveStatus?.status === "Present",
    ).length;

    const associationsPayload = unwrapApiPayload(associationsResponse);
    const associationsData =
      associationsPayload?.data && !Array.isArray(associationsPayload.data)
        ? associationsPayload.data
        : associationsPayload;
    const companies = Array.isArray(associationsData?.companies)
      ? associationsData.companies
      : [];
    const colleges = Array.isArray(associationsData?.colleges)
      ? associationsData.colleges
      : [];

    return [
      {
        name: "Today Trainers",
        stat: uniqueTrainers.size.toString(),
        icon: UserGroupIcon,
        color: "bg-blue-500",
      },
      {
        name: "Companies",
        stat: companies.length.toString(),
        icon: BuildingOfficeIcon,
        color: "bg-indigo-500",
      },
      {
        name: "Colleges",
        stat: colleges.length.toString(),
        icon: BuildingLibraryIcon,
        color: "bg-purple-500",
      },
      {
        name: "Pending Verifications",
        stat: "0",
        icon: ClipboardDocumentCheckIcon,
        color: "bg-orange-500",
      },
      {
        name: "Attendance Summary",
        stat: `${presentCount}/${liveSchedules.length}`,
        icon: ClockIcon,
        color: "bg-green-500",
      },
    ];
  }

  const rawStats = Array.isArray(dashboardData?.stats) ? dashboardData.stats : [];
  if (rawStats.length === 0) {
    return DEFAULT_STATS;
  }

  return rawStats.map((item) => ({
    name: item?.name || "Metric",
    stat: String(item?.stat ?? "0"),
    icon:
      item?.iconType === "companies"
        ? BuildingOfficeIcon
        : item?.iconType === "colleges"
          ? BuildingLibraryIcon
          : item?.iconType === "pending"
            ? ClipboardDocumentCheckIcon
            : item?.iconType === "attendance"
              ? ClockIcon
              : UserGroupIcon,
    color:
      item?.iconType === "companies"
        ? "bg-indigo-500"
        : item?.iconType === "colleges"
          ? "bg-purple-500"
          : item?.iconType === "pending"
            ? "bg-orange-500"
            : item?.iconType === "attendance"
              ? "bg-green-500"
              : "bg-blue-500",
  }));
};

const SpocDashboard = () => {
  const {
    portalData,
    dashboardData,
    portalRole,
    portalLoading,
    refreshPortalData,
    resourceMap,
  } = usePortalData((state) => ({
    portalData: state.portalData,
    dashboardData: state.dashboardData,
    portalRole: state.portalRole,
    portalLoading: state.loading,
    refreshPortalData: state.refreshPortalData,
    resourceMap: state.resourceMap,
  }));

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("--:--:--");
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const portalDashboard =
    portalRole === "SPOCAdmin" && dashboardData ? dashboardData : null;
  const shouldFetchSpocFallback = !portalDashboard && !portalLoading;
  const spocFallbackQuery = useSpocDashboardQuery({
    enabled: shouldFetchSpocFallback,
  });
  const fallbackResourceMap = spocFallbackQuery.data?.resourceMap || {};

  useEffect(() => {
    const fetchedAt =
      portalData?.fetchedAt ||
      spocFallbackQuery.data?.fetchedAt ||
      null;
    if (!fetchedAt) return;
    setLastUpdated(getCurrentTimeLabel(fetchedAt));
  }, [portalData?.fetchedAt, spocFallbackQuery.data?.fetchedAt]);

  const stats = useMemo(() => {
    if (portalDashboard) {
      return buildStatsFromBundle(resourceMap, portalDashboard);
    }

    return buildStatsFromBundle(fallbackResourceMap, null);
  }, [fallbackResourceMap, portalDashboard, resourceMap]);

  const recentActivity = useMemo(() => {
    if (Array.isArray(portalDashboard?.recentActivity) && portalDashboard.recentActivity.length) {
      return portalDashboard.recentActivity;
    }

    return [
      {
        id: 1,
        type: "status",
        content: "SPOC Dashboard synchronization complete",
        date: "Just now",
      },
    ];
  }, [portalDashboard?.recentActivity]);

  const handleSync = async () => {
    try {
      setIsRefreshing(true);
      const [portalRefreshResult, fallbackRefreshResult] = await Promise.allSettled([
        refreshPortalData(),
        spocFallbackQuery.refetch(),
      ]);

      const refreshedTimestamp =
        portalRefreshResult.status === "fulfilled"
          ? portalRefreshResult.value?.fetchedAt
          : fallbackRefreshResult.status === "fulfilled"
            ? fallbackRefreshResult.value?.data?.fetchedAt
            : null;

      setLastUpdated(getCurrentTimeLabel(refreshedTimestamp || new Date()));
    } catch (error) {
      console.error("Error refreshing dashboard stats:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const classNames = (...classes) => classes.filter(Boolean).join(" ");

  const showSkeleton =
    !hasMounted
    || (
      !portalDashboard &&
      (portalLoading ||
        (shouldFetchSpocFallback &&
          spocFallbackQuery.isPending &&
          !spocFallbackQuery.data))
    );

  if (showSkeleton) {
    return (
      <PortalLoadingState
        title="Loading SPOC dashboard"
        description="Preparing attendance and schedule insights."
      />
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold bg-linear-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
            SPOC Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time overview of training and attendance
          </p>
        </div>
        <button
          onClick={handleSync}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <ArrowPathIcon
            className={classNames(
              isRefreshing || portalLoading || spocFallbackQuery.isFetching
                ? "animate-spin"
                : "",
              "h-4 w-4 mr-2 text-gray-500",
            )}
          />
          Sync Data
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-10">
        {stats.map((item) => (
          <div
            key={item.name}
            className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300"
          >
            <dt>
              <div className={classNames(item.color, "absolute rounded-xl p-3")}>
                <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500">
                {item.name}
              </p>
            </dt>
            <dd className="ml-16 flex items-baseline">
              <p className="text-2xl font-bold text-gray-900">{item.stat}</p>
            </dd>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-transparent via-gray-100 to-transparent" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-50">
            <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
          </div>
          <ul role="list" className="divide-y divide-gray-50">
            {recentActivity.map((activity) => (
              <li
                key={activity.id}
                className="px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-indigo-600">
                    {activity.content}
                  </p>
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                    {activity.type}
                  </span>
                </div>
                <div className="mt-1 flex items-center text-xs text-gray-400">
                  <ClockIcon className="h-3 w-3 mr-1" />
                  {activity.date}
                </div>
              </li>
            ))}
          </ul>
          {recentActivity.length > 0 && (
            <div className="px-6 py-3 bg-gray-50 text-center">
              <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                View Full Log
              </button>
            </div>
          )}
        </div>

        <div className="bg-linear-to-br from-indigo-600 to-blue-700 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-4">Training Oversight</h2>
            <p className="text-indigo-100 mb-6 text-sm leading-relaxed">
              This panel provides a high-level overview of all active training
              sessions across your colleges. Use the sidebar to verify
              attendance, view schedules, or generate reports.
            </p>
            <div className="flex items-center text-xs text-indigo-200">
              <span className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse" />
              Live system status - Last sync: {lastUpdated}
            </div>
          </div>
          <AcademicCapIcon className="absolute -bottom-10 -right-10 h-64 w-64 text-white opacity-10 rotate-12" />
        </div>
      </div>
    </div>
  );
};

export default SpocDashboard;
