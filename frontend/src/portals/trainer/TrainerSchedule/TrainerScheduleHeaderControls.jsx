"use client";

import { memo } from "react";
import { CalendarDaysIcon, ListBulletIcon } from "@heroicons/react/24/outline";

const TrainerScheduleHeaderControls = memo(function TrainerScheduleHeaderControls({
  loading,
  error,
  selectedMonth,
  onMonthChange,
  view,
  onListView,
  onCalendarView,
}) {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Schedule</h1>
        <p className="text-sm text-gray-500">Manage sessions and attendance.</p>
        {loading ? (
          <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
            Refreshing schedule
          </span>
        ) : null}
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="month"
          value={selectedMonth}
          onChange={onMonthChange}
          className="w-full rounded-lg border-gray-300 px-3 py-2.5 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:w-auto"
        />
        <div className="flex w-full overflow-hidden rounded-lg border border-gray-300 shadow-sm sm:w-auto">
          <button
            onClick={onListView}
            className={`flex flex-1 items-center justify-center px-4 py-2.5 text-sm font-medium sm:flex-none ${
              view === "list"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <ListBulletIcon className="mr-2 h-4 w-4" />
            List
          </button>
          <button
            onClick={onCalendarView}
            className={`flex flex-1 items-center justify-center border-l border-gray-300 px-4 py-2.5 text-sm font-medium sm:flex-none ${
              view === "calendar"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <CalendarDaysIcon className="mr-2 h-4 w-4" />
            Calendar
          </button>
        </div>
      </div>
    </>
  );
});

export default TrainerScheduleHeaderControls;
