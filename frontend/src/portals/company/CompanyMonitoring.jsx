"use client";

import { useEffect, useState } from "react";

import PortalLoadingState from "@/components/common/PortalLoadingState";
import { usePortalRoleGuard } from "@/hooks/usePortalRoleGuard";
import { companyPortalService } from "@/services/companyPortalService";

export default function CompanyMonitoring() {
  const { allowed, loading: authLoading } = usePortalRoleGuard("company");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!allowed) return undefined;

    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const response = await companyPortalService.getTodayMonitoring();
        if (!cancelled) {
          if (response.success) setRows(response.data || []);
          else setError(response.message || "Failed to load monitoring data");
        }
      } catch {
        if (!cancelled) setError("Failed to load monitoring data");
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
    return <PortalLoadingState title="Loading monitoring" description="Verifying access." />;
  }

  if (loading) {
    return <PortalLoadingState title="Loading monitoring" description="Fetching today&apos;s sessions." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Today&apos;s Monitoring</h1>
        <p className="mt-1 text-slate-600">Real-time trainer assignments and attendance status.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Trainer</th>
                <th className="px-4 py-3 font-medium">College</th>
                <th className="px-4 py-3 font-medium">Course</th>
                <th className="px-4 py-3 font-medium">Session Time</th>
                <th className="px-4 py-3 font-medium">Check-In</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{row.trainer?.name}</div>
                    <div className="text-xs text-slate-500">{row.trainer?.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{row.college?.name}</div>
                    <div className="text-xs text-slate-500">{row.college?.location}</div>
                  </td>
                  <td className="px-4 py-3">{row.course}</td>
                  <td className="px-4 py-3">{row.sessionTime}</td>
                  <td className="px-4 py-3">
                    {row.checkIn ? new Date(row.checkIn).toLocaleTimeString() : "—"}
                  </td>
                  <td className="px-4 py-3">{row.attendanceStatus || row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">No sessions scheduled for today.</p>
        ) : null}
      </div>
    </div>
  );
}
