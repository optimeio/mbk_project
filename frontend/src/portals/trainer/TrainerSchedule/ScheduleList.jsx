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
                    <div className="ml-2 shrink-0 flex space-x-2">
                      <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${schedule.ui.badge.className}`}>
                        {schedule.ui.badge.label}
                      </p>
                      {schedule.ui.showPastScheduleIndicator ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                          Past Schedule
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <MapPinIcon className="shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                    <p>{schedule.college}</p>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <ClockIcon className="shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                    <p>{schedule.date} | {schedule.time}</p>
                  </div>

                  {schedule.rescheduleReason ? (
                    <div className="mt-3 flex items-start p-2 bg-amber-50 rounded-md border border-amber-100">
                      <ExclamationCircleIcon className="h-4 w-4 text-amber-500 mt-0.5 mr-2 shrink-0" />
                      <p className="text-xs text-amber-700">
                        <span className="font-semibold">Rescheduled:</span> {schedule.rescheduleReason}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {schedule.ui.primaryAction?.kind === "checkin" ? (
                      <button
                        onClick={() => onOpenCheckIn(schedule)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-bold rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <CheckCircleIcon className="h-4 w-4 mr-1.5" />
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
                    ) : schedule.ui.primaryAction?.kind === "scheduled-info" ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        {schedule.ui.primaryAction.label}
                      </span>
                    ) : schedule.ui.primaryAction?.kind === "expired-info" ? (
                      <span className="text-xs text-red-500 font-medium italic bg-red-50 px-2 py-1 rounded border border-red-100">
                        {schedule.ui.primaryAction.label}
                      </span>
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

                    {schedule.ui.isGeoPending ? (
                      <div className="mt-1 flex flex-col">
                        <span className="text-[10px] text-amber-700 font-bold italic">
                          Check-Out Pending
                        </span>
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 mt-0.5 w-fit">
                          Reason: {schedule.geoValidationComment}
                        </span>
                      </div>
                    ) : null}

                    {schedule.ui.shouldShowCompletedText ? (
                      <span className="text-xs text-gray-500 italic">Session Completed</span>
                    ) : null}

                    {schedule.status === "scheduled" ? (
                      <button
                        onClick={() => onDelete(schedule.id)}
                        className="ml-4 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                        title="Delete Schedule"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
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
