import { memo } from "react";

import {
  ArrowRightOnRectangleIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

function PendingActionsPanel({
  pendingSchedules,
  onOpenCheckIn,
  onOpenCheckOut,
}) {
  if (!pendingSchedules.length) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md shadow-sm">
      <div className="flex">
        <div className="shrink-0">
          <ExclamationCircleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
        </div>
        <div className="ml-3 w-full">
          <h3 className="text-sm font-medium text-yellow-800">Pending Actions (Past Months)</h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              You have incomplete training days or check-out submissions that still need a valid geo-tag.
              Please update them to complete your records.
            </p>
          </div>
          <div className="mt-4 space-y-3">
            {pendingSchedules.map((schedule) => (
              <div
                key={schedule.id}
                className="bg-white p-3 rounded border border-yellow-200 flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold text-gray-900">{schedule.college}</p>
                  <p className="text-xs text-gray-500">{schedule.date} | {schedule.time}</p>
                </div>
                <div className="flex gap-2">
                  {(
                    schedule?.ui?.primaryAction?.kind === "checkin"
                    || schedule.ui.isAttendanceRejected
                  ) ? (
                    <button
                      onClick={() => onOpenCheckIn(schedule)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      {schedule?.ui?.primaryAction?.label || "Re-Check In"}
                    </button>
                  ) : (
                    schedule?.ui?.primaryAction?.kind === "checkout"
                    || schedule.ui.isGeoPending
                    || schedule.ui.isInProgress
                  ) ? (
                    <button
                      onClick={() => onOpenCheckOut(schedule)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4 mr-1" />
                      {schedule?.ui?.primaryAction?.label
                        || (schedule.geoValidationComment ? "Re-Check Out" : "Check Out")}
                    </button>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-[11px] font-semibold text-yellow-700">
                      {schedule?.ui?.primaryAction?.label || "No pending action"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(PendingActionsPanel);
