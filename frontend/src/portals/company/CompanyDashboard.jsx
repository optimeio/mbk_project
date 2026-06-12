"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarClock,
  GraduationCap,
  Users,
} from "lucide-react";

import PortalLoadingState from "@/components/common/PortalLoadingState";
import { usePortalRoleGuard } from "@/hooks/usePortalRoleGuard";
import { companyPortalService } from "@/services/companyPortalService";

const MetricCard = ({ label, value, icon: Icon, href }) => (
  <Link
    href={href || "#"}
    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
  >
    <div className="mb-3 inline-flex rounded-xl bg-blue-50 p-2.5 text-blue-600">
      <Icon className="h-5 w-5" />
    </div>
    <p className="text-sm text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
  </Link>
);

export default function CompanyDashboard() {
  const { allowed, loading: authLoading } = usePortalRoleGuard("company");
  const [profile, setProfile] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [monitoring, setMonitoring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!allowed) return undefined;

    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const [profileRes, metricsRes, monitoringRes] = await Promise.all([
          companyPortalService.getProfile(),
          companyPortalService.getDashboardMetrics().catch(() => null),
          companyPortalService.getTodayMonitoring().catch(() => null),
        ]);

        if (cancelled) return;

        if (profileRes.success) setProfile(profileRes.company);
        if (metricsRes?.success) setMetrics(metricsRes.data);
        if (monitoringRes?.success) setMonitoring(monitoringRes.data || []);

        if (!profileRes.success) {
          setError(profileRes.message || "Failed to load company profile");
        }
      } catch {
        if (!cancelled) setError("Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  if (authLoading || !allowed) {
    return <PortalLoadingState title="Loading company portal" description="Verifying your session." />;
  }

  if (loading) {
    return <PortalLoadingState title="Loading dashboard" description="Fetching company metrics." />;
  }

  if (error && !profile) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">{error}</div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-[#1d5f87] to-[#2b6d93] p-6 text-white shadow-lg md:p-8">
        <p className="text-sm font-medium uppercase tracking-wide text-blue-100">Company Portal</p>
        <h1 className="mt-2 text-2xl font-bold md:text-3xl">{profile?.name || "Company Dashboard"}</h1>
        <p className="mt-2 text-blue-100">
          Welcome, {profile?.adminName || "Admin"}. Monitor training sessions, colleges, and trainer activity.
        </p>
        {profile?.companyCode ? (
          <p className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
            Code: {profile.companyCode}
          </p>
        ) : null}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Sessions"
          value={metrics?.totalSessions ?? "—"}
          icon={CalendarClock}
          href="/company/sessions"
        />
        <MetricCard
          label="Completed"
          value={metrics?.completedSessions ?? "—"}
          icon={BarChart3}
          href="/company/reports"
        />
        <MetricCard
          label="Active Trainers"
          value={metrics?.activeTrainers ?? "—"}
          icon={Users}
          href="/company/hiring"
        />
        <MetricCard
          label="Colleges"
          value={metrics?.totalColleges ?? "—"}
          icon={GraduationCap}
          href="/company/colleges"
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Today&apos;s Monitoring</h2>
            <p className="text-sm text-slate-500">Live trainer assignments for today</p>
          </div>
          <Link href="/company/monitoring" className="text-sm font-semibold text-blue-700 hover:text-blue-800">
            View all →
          </Link>
        </div>

        {monitoring.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No sessions scheduled for today.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-2 pr-4 font-medium">Trainer</th>
                  <th className="py-2 pr-4 font-medium">College</th>
                  <th className="py-2 pr-4 font-medium">Course</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {monitoring.slice(0, 5).map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4">{row.trainer?.name}</td>
                    <td className="py-3 pr-4">{row.college?.name}</td>
                    <td className="py-3 pr-4">{row.course}</td>
                    <td className="py-3">{row.attendanceStatus || row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/company/sessions"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200"
        >
          <Building2 className="h-5 w-5 text-blue-600" />
          <h3 className="mt-3 font-semibold text-slate-900">Training Sessions</h3>
          <p className="mt-1 text-sm text-slate-500">Browse scheduled and completed sessions.</p>
        </Link>
        <Link
          href="/company/reports"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200"
        >
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <h3 className="mt-3 font-semibold text-slate-900">Workflow Reports</h3>
          <p className="mt-1 text-sm text-slate-500">Review attendance and session outcomes.</p>
        </Link>
        <Link
          href="/company/profile"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200"
        >
          <Users className="h-5 w-5 text-blue-600" />
          <h3 className="mt-3 font-semibold text-slate-900">Company Profile</h3>
          <p className="mt-1 text-sm text-slate-500">Update admin contact details.</p>
        </Link>
      </div>
    </div>
  );
}
