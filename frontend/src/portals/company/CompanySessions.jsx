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

export default function CompanySessions() {
  const { allowed, loading: authLoading } = usePortalRoleGuard("company");
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!allowed) return undefined;

    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const response = await companyPortalService.getTrainingSessions({ limit: 50 });
        if (!cancelled) {
          if (response.success) setSessions(response.data || []);
          else setError(response.message || "Failed to load sessions");
        }
      } catch {
        if (!cancelled) setError("Failed to load sessions");
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
    return <PortalLoadingState title="Loading sessions" description="Verifying access." />;
  }

  if (loading) {
    return <PortalLoadingState title="Loading sessions" description="Fetching training sessions." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Training Sessions</h1>
        <p className="mt-1 text-slate-600">All scheduled and completed training sessions for your company.</p>
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
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session._id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{formatDate(session.scheduledDate)}</td>
                  <td className="px-4 py-3">{session.collegeId?.name || "—"}</td>
                  <td className="px-4 py-3">{session.courseId?.name || "—"}</td>
                  <td className="px-4 py-3">
                    {session.trainerId?.name ||
                      [session.trainerId?.firstName, session.trainerId?.lastName].filter(Boolean).join(" ") ||
                      "Unassigned"}
                  </td>
                  <td className="px-4 py-3">{session.status || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && sessions.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">No training sessions found.</p>
        ) : null}
      </div>
    </div>
  );
}
