"use client";

import { useEffect, useState } from "react";

import PortalLoadingState from "@/components/common/PortalLoadingState";
import { usePortalRoleGuard } from "@/hooks/usePortalRoleGuard";
import { companyPortalService } from "@/services/companyPortalService";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
};

export default function CompanyReports() {
  const { allowed, loading: authLoading } = usePortalRoleGuard("company");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!allowed) return undefined;

    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const response = await companyPortalService.getWorkflowReports({ limit: 50 });
        if (!cancelled) {
          if (response.success) setReports(response.data || []);
          else setError(response.message || "Failed to load reports");
        }
      } catch {
        if (!cancelled) setError("Failed to load reports");
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
    return <PortalLoadingState title="Loading reports" description="Verifying access." />;
  }

  if (loading) {
    return <PortalLoadingState title="Loading reports" description="Fetching workflow reports." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Workflow Reports</h1>
        <p className="mt-1 text-slate-600">Session attendance and trainer check-in/out records.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">College</th>
                <th className="px-4 py-3 font-medium">Course</th>
                <th className="px-4 py-3 font-medium">Trainer</th>
                <th className="px-4 py-3 font-medium">Check-In</th>
                <th className="px-4 py-3 font-medium">Check-Out</th>
                <th className="px-4 py-3 font-medium">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((entry) => {
                const schedule = entry.schedule || {};
                return (
                  <tr key={schedule._id || `${schedule.scheduledDate}-${schedule.collegeId}`} className="border-t border-slate-100">
                    <td className="px-4 py-3">{formatDate(schedule.scheduledDate)}</td>
                    <td className="px-4 py-3">{schedule.collegeId?.name || "—"}</td>
                    <td className="px-4 py-3">{schedule.courseId?.name || "—"}</td>
                    <td className="px-4 py-3">
                      {schedule.trainerId?.name ||
                        [schedule.trainerId?.firstName, schedule.trainerId?.lastName].filter(Boolean).join(" ") ||
                        "—"}
                    </td>
                    <td className="px-4 py-3">
                      {entry.checkIn ? new Date(entry.checkIn).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {entry.checkOut ? new Date(entry.checkOut).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">{entry.attendanceStatus || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && reports.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">No workflow reports available.</p>
        ) : null}
      </div>
    </div>
  );
}
