"use client";

import { useEffect, useState, useMemo } from "react";

import PortalLoadingState from "@/components/common/PortalLoadingState";
import { usePortalRoleGuard } from "@/hooks/usePortalRoleGuard";
import { companyPortalService } from "@/services/companyPortalService";
import { getTrainingColleges } from "@/services/trainingCollegeService";
import { getTrainingCourses } from "@/services/courseService";
import ScheduleFilterPanel from "@/components/common/ScheduleFilterPanel";
import {
  clearTrainerDashboardScheduleSummaryCache,
  clearTrainerDashboardSnapshot,
  signalTrainerDashboardRefresh,
  normalizeTrainerId,
} from "@/portals/trainer/dashboard/dashboardUtils";

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
  const [successMessage, setSuccessMessage] = useState("");
  const [processingScheduleId, setProcessingScheduleId] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({ trainer: "", college: "", course: "" });
  const [trainers, setTrainers] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    if (!allowed) return undefined;

    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        setSuccessMessage("");
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

  useEffect(() => {
    if (!allowed) return undefined;

    let cancelled = false;
    const loadFiltersData = async () => {
      try {
        const [trainersRes, collegesRes, coursesRes, staticCollegesData, staticCoursesData] = await Promise.all([
          companyPortalService.getTrainers().catch(() => ({ success: false, data: [] })),
          companyPortalService.getColleges().catch(() => ({ success: false, data: [] })),
          companyPortalService.getCourses().catch(() => ({ success: false, data: [] })),
          getTrainingColleges().catch(() => []),
          getTrainingCourses().catch(() => [])
        ]);

        if (cancelled) return;

        const dbTrainers = trainersRes.success ? (trainersRes.data || []) : [];
        const dbColleges = collegesRes.success ? (collegesRes.data || []) : [];
        const dbCourses = coursesRes.success ? (coursesRes.data || []) : [];

        // Map trainers
        const mappedTrainers = dbTrainers.map((t) => ({
          id: t._id || t.id,
          _id: t._id || t.id,
          name: t.name || `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Unknown',
          firstName: t.firstName || '',
          lastName: t.lastName || '',
          specialization: t.specialization || '',
        }));
        setTrainers(mappedTrainers);

        // Merge colleges
        const seenColleges = new Set();
        const mergedColleges = [];
        dbColleges.forEach((c) => {
          const nameKey = String(c.name || '').trim().toLowerCase();
          if (nameKey) {
            seenColleges.add(nameKey);
            mergedColleges.push({
              id: c._id || c.id,
              _id: c._id || c.id,
              name: c.name,
              city: c.city || '',
              state: c.state || 'Tamil Nadu'
            });
          }
        });
        (staticCollegesData || []).forEach((c) => {
          const nameKey = String(c.name || '').trim().toLowerCase();
          if (!seenColleges.has(nameKey)) {
            seenColleges.add(nameKey);
            mergedColleges.push(c);
          }
        });
        setColleges(mergedColleges);

        // Merge courses
        const seenCourses = new Set();
        const mergedCourses = [];
        dbCourses.forEach((c) => {
          const nameKey = String(c.name || c.title || '').trim().toLowerCase();
          if (nameKey) {
            seenCourses.add(nameKey);
            mergedCourses.push({
              id: c._id || c.id,
              _id: c._id || c.id,
              name: c.name || c.title,
              category: c.category || ''
            });
          }
        });
        (staticCoursesData || []).forEach((c) => {
          const nameKey = String(c.name || '').trim().toLowerCase();
          if (!seenCourses.has(nameKey)) {
            seenCourses.add(nameKey);
            mergedCourses.push(c);
          }
        });
        setCourses(mergedCourses);

      } catch (err) {
        console.error("Failed to load company portal filters data:", err);
      }
    };

    loadFiltersData();
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  // Apply filters to sessions
  const filteredSessions = useMemo(() => {
    let result = sessions;
    if (filters.trainer) {
      result = result.filter((s) => {
        const trainerId = s.trainerId?._id || s.trainerId?.id || s.trainerId || '';
        return String(trainerId) === String(filters.trainer);
      });
    }
    if (filters.college) {
      result = result.filter((s) => {
        const collegeId = s.collegeId?._id || s.collegeId?.id || s.collegeId || '';
        return String(collegeId) === String(filters.college);
      });
    }
    if (filters.course) {
      result = result.filter((s) => {
        const courseId = s.courseId?._id || s.courseId?.id || s.courseId || '';
        return String(courseId) === String(filters.course);
      });
    }
    return result;
  }, [sessions, filters]);

  const handleDeleteSchedule = async (session) => {
    const scheduleId = session?._id;
    if (!scheduleId) return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel this scheduled session?",
    );
    if (!confirmed) return;

    const reason = window.prompt(
      "Please provide a reason for cancellation (optional):",
      "",
    );

    try {
      setProcessingScheduleId(scheduleId);
      setError("");
      setSuccessMessage("");

      await companyPortalService.deleteSchedule(scheduleId, reason || "");
      setSessions((prev) => prev.filter((item) => item._id !== scheduleId));
      setSuccessMessage("Session cancelled successfully.");

      const trainerId = normalizeTrainerId(session.trainerId || session.trainer || null);
      if (trainerId) {
        clearTrainerDashboardScheduleSummaryCache(trainerId);
        clearTrainerDashboardSnapshot(trainerId);
        signalTrainerDashboardRefresh(trainerId);
      }
    } catch (err) {
      console.error("Error cancelling session:", err);
      setError("Failed to cancel session. Please try again.");
    } finally {
      setProcessingScheduleId(null);
    }
  };

  const handleRescheduleSchedule = async (session) => {
    const scheduleId = session?._id;
    if (!scheduleId) return;

    const currentDate = session.scheduledDate ? session.scheduledDate.slice(0, 10) : "";
    const newScheduledDate = window.prompt(
      "Enter a new scheduled date for this session (YYYY-MM-DD):",
      currentDate,
    );
    if (!newScheduledDate) return;

    const parsedDate = new Date(newScheduledDate);
    if (Number.isNaN(parsedDate.getTime()) || newScheduledDate.length !== 10) {
      setError("Please enter a valid date in YYYY-MM-DD format.");
      return;
    }

    const reason = window.prompt(
      "Provide a reason for rescheduling this session (optional):",
      "",
    );

    try {
      setProcessingScheduleId(scheduleId);
      setError("");
      setSuccessMessage("");

      const response = await companyPortalService.updateSchedule(scheduleId, {
        scheduledDate: newScheduledDate,
        rescheduleReason: reason || undefined,
      });

      if (response?.success) {
        setSessions((prev) =>
          prev.map((item) =>
            item._id === scheduleId
              ? {
                  ...item,
                  scheduledDate: newScheduledDate,
                  rescheduleReason: reason || item.rescheduleReason,
                }
              : item,
          ),
        );
        setSuccessMessage("Session rescheduled successfully.");
      } else {
        setError(response?.message || "Failed to reschedule session.");
      }

      const trainerId = normalizeTrainerId(session.trainerId || session.trainer || null);
      if (trainerId) {
        clearTrainerDashboardScheduleSummaryCache(trainerId);
        clearTrainerDashboardSnapshot(trainerId);
        signalTrainerDashboardRefresh(trainerId);
      }
    } catch (err) {
      console.error("Error rescheduling session:", err);
      setError("Failed to reschedule session. Please try again.");
    } finally {
      setProcessingScheduleId(null);
    }
  };

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

      <ScheduleFilterPanel
        trainers={trainers}
        colleges={colleges}
        courses={courses}
        onFilterChange={setFilters}
        isOpen={true}
      />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
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
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((session) => (
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
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {session.status?.toLowerCase() === "cancelled" ? (
                        <span className="text-sm text-slate-500">Cancelled</span>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={processingScheduleId === session._id}
                            onClick={() => handleDeleteSchedule(session)}
                            className="inline-flex items-center rounded-md bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 disabled:hover:bg-rose-600"
                          >
                            {processingScheduleId === session._id ? "Cancelling..." : "Cancel"}
                          </button>
                          <button
                            type="button"
                            disabled={processingScheduleId === session._id}
                            onClick={() => handleRescheduleSchedule(session)}
                            className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {processingScheduleId === session._id ? "Processing..." : "Reschedule"}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filteredSessions.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">No training sessions found.</p>
        ) : null}
      </div>
    </div>
  );
}
