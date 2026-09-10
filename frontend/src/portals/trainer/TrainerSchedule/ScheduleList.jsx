import { memo } from "react";

import {
  ArrowRightOnRectangleIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  MapPinIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

function ScheduleList({
  schedules,
  onOpenCheckIn,
  onOpenCheckOut,
  onOpenLateRequest,
  onDelete,
}) {
  if (!schedules.length) {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="text-center py-12">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No schedules</h3>
          <p className="mt-1 text-sm text-gray-500">No training sessions scheduled for this month.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {schedules.map((schedule) => (
          <li key={schedule.id}>
            <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-indigo-600 truncate">Day {schedule.dayNumber}</p>
                    <div className="ml-2 flex-shrink-0 flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        {schedule.session || "FULL_DAY"}
                      </span>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${schedule.ui.badgeClass}`}>
                        {schedule.ui.badgeText}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm font-semibold text-gray-700 mr-6">
                        <MapPinIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {schedule.college || schedule.collegeName || schedule.collegeId?.name || "Assigned College"}
                      </p>
                      <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <ClockIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {schedule.time || schedule.timing || schedule.timingLabel || "09:00 AM - 01:00 PM"}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <CalendarDaysIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                      <p>{schedule.date || schedule.dateFormatted || schedule.dateLabel || "Scheduled Date"}</p>
                    </div>
                  </div>
                  {schedule.course || schedule.courseName ? (
                    <div className="mt-1">
                      <p className="text-xs text-indigo-600 font-medium">
                        {schedule.course || schedule.courseName}
                      </p>
                    </div>
                  ) : null}
                  {schedule.subject ? (
                    <div className="mt-1">
                      <p className="text-xs text-gray-500">
                        <span className="font-medium text-gray-700">Topic:</span> {schedule.subject}
                      </p>
                    </div>
                  ) : null}
                  <div className="mt-3 flex items-center justify-between">
                    {schedule.ui.primaryAction?.kind === "checkin" ? (
                      <button
                        onClick={() => onOpenCheckIn(schedule)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-bold rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <CheckCircleIcon className="h-4 w-4 mr-1.5" />
                        {schedule.ui.primaryAction.label}
                      </button>
                    ) : schedule.ui.primaryAction?.kind === "late-checkin" ? (
                      <button
                        onClick={() => onOpenCheckIn(schedule)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-bold rounded-lg shadow-sm text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                      >
                        <ExclamationCircleIcon className="h-4 w-4 mr-1.5" />
                        {schedule.ui.primaryAction.label}
                      </button>
                    ) : schedule.ui.primaryAction?.kind === "checkout" ? (
                      <button
                        onClick={() => onOpenCheckOut(schedule)}
                        className={`inline-flex items-center px-4 py-2 border border-transparent text-xs font-bold rounded-lg shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                          schedule.ui.isInProgress
                            ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                            : "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                        }`}
                      >
                        <ArrowRightOnRectangleIcon className="h-4 w-4 mr-1.5" />
                        {schedule.ui.primaryAction.label}
                      </button>
                    ) : schedule.ui.primaryAction?.kind === "checkin-pending" ? (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-sm">
                          <ClockIcon className="h-4 w-4 mr-1.5 text-amber-600 animate-pulse" />
                          {schedule.ui.primaryAction.label}
                        </span>
                        <p className="text-[11px] text-amber-700 font-medium">
                          {schedule.checkInTime ? `Check-In submitted at ${schedule.checkInTime}. ` : "Check-In evidence uploaded. "}
                          Awaiting Admin / SPOC verification before Check-Out.
                        </p>
                      </div>
                    ) : schedule.ui.primaryAction?.kind === "late-request-pending" || schedule.isLateRequest ? (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-sm">
                          <ClockIcon className="h-4 w-4 mr-1.5 text-indigo-600 animate-pulse" />
                          Attendance Requested (Pending Approval)
                        </span>
                        <p className="text-[11px] text-indigo-700 font-medium">
                          All 4 proofs submitted. Awaiting Admin verification.
                        </p>
                      </div>
                    ) : schedule.ui.primaryAction?.kind === "late-request" ? (
                      <button
                        onClick={() => onOpenLateRequest && onOpenLateRequest(schedule)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-bold rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <ClockIcon className="h-4 w-4 mr-1.5" />
                        Request Attendance
                      </button>
                    ) : schedule.ui.primaryAction?.kind === "scheduled-info" ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        {schedule.ui.primaryAction.label}
                      </span>
                    ) : schedule.ui.primaryAction?.kind === "expired-info" ? (
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-xs text-rose-700 font-bold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 shadow-sm">
                          {schedule.ui.primaryAction.label}
                        </span>
                        <button
                          onClick={() => onOpenLateRequest && onOpenLateRequest(schedule)}
                          className="inline-flex items-center px-3.5 py-1.5 border border-indigo-600 text-xs font-bold rounded-lg text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition"
                        >
                          <ClockIcon className="h-3.5 w-3.5 mr-1 text-indigo-600" />
                          Request Attendance
                        </button>
                      </div>
                    ) : null}

                    {schedule.ui.isAttendanceRejected ? (
                      <div className="mt-1 flex flex-col">
                        <span className="text-[10px] text-red-600 font-bold italic">
                          Attendance Rejected
                        </span>
                        {schedule.verificationComment ? (
                          <span className="text-[10px] text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 mt-0.5 w-fit">
                            Reason: {schedule.verificationComment}
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    {schedule.ui.isGeoPending && !schedule.ui.isCheckInPending ? (
                      <div className="mt-1 flex flex-col">
                        <span className="text-[10px] text-amber-700 font-bold italic">
                          Check-Out Pending
                        </span>
                        {schedule.geoValidationComment ? (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 mt-0.5 w-fit">
                            Reason: {schedule.geoValidationComment}
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    {schedule.ui.shouldShowCompletedText ? (
                      <span className="text-xs text-gray-500 italic">Session Completed</span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default memo(ScheduleList);
