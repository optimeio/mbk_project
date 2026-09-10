"use client";

import { memo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
} from "lucide-react";

import { getStatusMeta } from "./dashboardUtils";

const safeRenderText = (val, fallback = "") => {
  if (val == null) return fallback;
  if (typeof val === "string" || typeof val === "number") return String(val);
  if (typeof val === "object") {
    if (typeof val.address === "string" && val.address.trim()) return val.address.trim();
    if (typeof val.name === "string" && val.name.trim()) return val.name.trim();
    if (typeof val.title === "string" && val.title.trim()) return val.title.trim();
    if (val.lat != null && val.lng != null) return `${val.lat}, ${val.lng}`;
    return fallback;
  }
  return String(val);
};

function TrainerDashboardSchedulesSection({
  recentActivities,
  upcomingSchedules,
  onOpenScheduleDate,
}) {
  const router = useRouter();

  const handleScheduleClick = (schedule) => {
    if (schedule?.id) {
      router.push(`/trainer/activities?scheduleId=${schedule.id}`);
    } else if (schedule?.rawDate) {
      onOpenScheduleDate(schedule.rawDate);
    } else {
      router.push("/trainer/activities");
    }
  };

  return (
    <>
      <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm sm:rounded-[28px]">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                Upcoming Sessions
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Click any assigned college session to record attendance and daily activities.
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 sm:px-6 sm:py-5">
          {upcomingSchedules.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {upcomingSchedules.slice(0, 4).map((schedule) => {
                const statusMeta = getStatusMeta(schedule.status);

                return (
                  <button
                    key={schedule.id}
                    type="button"
                    onClick={() => handleScheduleClick(schedule)}
                    className="flex w-full flex-col gap-3 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-orange-300 hover:bg-orange-50/40 md:flex-row md:items-center md:justify-between md:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-800">
                          Day {safeRenderText(schedule.dayNumber, "1")}
                        </span>
                        <h3 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                          {safeRenderText(schedule.college, "Assigned College")}
                        </h3>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-orange-600">{safeRenderText(schedule.course, "Course")}</p>
                      
                      <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                        <span className="inline-flex items-center font-semibold text-slate-700">
                          <MapPin className="mr-1 h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {safeRenderText(schedule.collegeLocation, "College Campus")}
                        </span>
                        <span className="inline-flex items-center font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          <Clock className="mr-1 h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          {safeRenderText(schedule.timingLabel, `${safeRenderText(schedule.startTime, "09:00 AM")} - ${safeRenderText(schedule.endTime, "01:00 PM")}`)}
                        </span>
                        <span className="inline-flex items-center text-slate-500">
                          <CalendarDays className="mr-1 h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {safeRenderText(schedule.dateLabel, "Unscheduled")}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[11px] text-emerald-700 font-medium">
                        * Early arrival & location visit permitted prior to class start.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${statusMeta.className}`}
                      >
                        {statusMeta.label}
                      </span>
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm transition-transform group-hover:scale-105">
                        <ArrowRight className="h-5 w-5" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center sm:px-6 sm:py-14">
              <CalendarDays className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-700">
                No upcoming sessions
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Your next assigned classes will appear here.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm sm:rounded-[28px]">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                Recent Activity
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Your latest completed or submitted trainer sessions.
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 sm:px-6">
          {recentActivities.length > 0 ? (
            <div className="space-y-3">
              {recentActivities.map((activity) => {
                const statusMeta = getStatusMeta(activity.status);

                // Determine display state based on merged attendance data
                const isAdminApproved = activity.status === "completed";
                const isPendingApproval = activity.status === "pending";
                const isAbsent =
                  !isAdminApproved &&
                  !isPendingApproval &&
                  (activity.status === "timeout" ||
                    activity.status === "absent" ||
                    activity.isTimeOut ||
                    !activity.hasAttendanceRecord);

                // Only show request button if session is past AND no upload exists
                const canRequestAttendance = isAbsent && !activity.hasUploadedImage;

                const handleActivityClick = () => {
                  router.push("/trainer/attendance");
                };

                // Determine badge to show
                let badgeEl;
                if (isAdminApproved) {
                  badgeEl = (
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                      Present
                    </span>
                  );
                } else if (isPendingApproval) {
                  badgeEl = (
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      <Clock className="mr-1 h-3.5 w-3.5 text-amber-600" />
                      Awaiting Admin Approval
                    </span>
                  );
                } else {
                  badgeEl = (
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusMeta.className}`}
                    >
                      {statusMeta.label}
                    </span>
                  );
                }

                return (
                  <div
                    key={activity.id}
                    onClick={handleActivityClick}
                    className="flex w-full flex-col gap-3 rounded-2xl border border-slate-200 px-4 py-4 text-left transition hover:border-slate-300 hover:bg-slate-50 md:flex-row md:items-center md:justify-between md:px-5 cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs font-bold text-indigo-700">
                          Day {safeRenderText(activity.dayNumber, "1")}
                        </span>
                        <h3 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                          {safeRenderText(activity.college, "Assigned College")}
                        </h3>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-slate-600">
                        <span className="inline-flex items-center font-semibold text-slate-700">
                          <BookOpen className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                          {safeRenderText(activity.course, "Course")}
                        </span>
                        <span className="inline-flex items-center font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          <Clock className="mr-1.5 h-3.5 w-3.5 text-indigo-500" />
                          {safeRenderText(activity.timingLabel, `${safeRenderText(activity.startTime, "09:00 AM")} - ${safeRenderText(activity.endTime, "01:00 PM")}`)}
                        </span>
                        <span className="inline-flex items-center text-slate-500">
                          <CalendarDays className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                          {safeRenderText(activity.dateLabel, "Unscheduled")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
                      {badgeEl}
                      {canRequestAttendance && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActivityClick();
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
                        >
                          <Clock className="h-3.5 w-3.5" />
                          Request Attendance
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center sm:px-6 sm:py-14">
              <CheckCircle2 className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-700">
                No recent activity
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Completed sessions will appear here after your classes are updated.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default memo(TrainerDashboardSchedulesSection);
