import { memo, useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

const STATUS_DOT = {
  completed: "bg-green-500",
  checkedin: "bg-blue-500",
  "checked-in": "bg-blue-500",
  scheduled: "bg-indigo-400",
  pending: "bg-yellow-400",
  rejected: "bg-red-400",
  cancelled: "bg-gray-300",
  canceled: "bg-gray-300",
};

function getDotClass(status = "") {
  const key = status.toLowerCase().replace(/\s+/g, "");
  return STATUS_DOT[key] || "bg-gray-400";
}

function getDayKey(dateStr) {
  // dateStr comes from assignedDate which is YYYY-MM-DD
  return dateStr ? dateStr.slice(0, 10) : null;
}

function buildCalendarGrid(year, month) {
  // month is 0-indexed
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  // Empty cells for days before the 1st
  for (let i = 0; i < firstDay; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }
  return cells;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ScheduleCalendarView({ schedules, onOpenCheckIn, onOpenCheckOut, selectedMonth }) {
  // selectedMonth is "YYYY-MM" string
  const [parsedYear, parsedMonthIdx] = useMemo(() => {
    if (!selectedMonth) {
      const now = new Date();
      return [now.getFullYear(), now.getMonth()];
    }
    const [y, m] = selectedMonth.split("-");
    return [parseInt(y, 10), parseInt(m, 10) - 1];
  }, [selectedMonth]);

  // Build a map from date key (YYYY-MM-DD) → [schedule, ...]
  const schedulesByDate = useMemo(() => {
    const map = {};
    for (const s of schedules) {
      const key = getDayKey(s.assignedDate);
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return map;
  }, [schedules]);

  const [selectedDay, setSelectedDay] = useState(null);

  const cells = useMemo(() => buildCalendarGrid(parsedYear, parsedMonthIdx), [parsedYear, parsedMonthIdx]);

  const monthLabel = new Date(parsedYear, parsedMonthIdx, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const todayKey = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  const selectedDaySchedules = useMemo(() => {
    if (!selectedDay) return [];
    const key = `${parsedYear}-${String(parsedMonthIdx + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
    return schedulesByDate[key] || [];
  }, [selectedDay, parsedYear, parsedMonthIdx, schedulesByDate]);

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Calendar Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">{monthLabel}</h2>
        <span className="text-xs text-gray-400">{schedules.length} session{schedules.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 text-center border-b bg-gray-50">
        {DAY_LABELS.map((d) => (
          <div key={d} className="py-2 text-xs font-medium text-gray-500">{d}</div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 divide-x divide-y border-b">
        {cells.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="h-14 bg-gray-50/60" />;
          }

          const dateKey = `${parsedYear}-${String(parsedMonthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const daySchedules = schedulesByDate[dateKey] || [];
          const isToday = dateKey === todayKey;
          const isSelected = selectedDay === day;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`h-14 flex flex-col items-start justify-start p-1 text-left transition-colors ${
                isSelected
                  ? "bg-indigo-50 ring-inset ring-2 ring-indigo-400"
                  : "hover:bg-gray-50"
              }`}
            >
              <span className={`text-xs font-medium leading-none mb-1 w-5 h-5 flex items-center justify-center rounded-full ${
                isToday
                  ? "bg-indigo-600 text-white"
                  : isSelected
                  ? "text-indigo-700"
                  : "text-gray-700"
              }`}>
                {day}
              </span>
              <div className="flex flex-wrap gap-0.5">
                {daySchedules.slice(0, 3).map((s, i) => (
                  <span
                    key={s.id || i}
                    className={`w-1.5 h-1.5 rounded-full ${getDotClass(s.status)}`}
                    title={s.college}
                  />
                ))}
                {daySchedules.length > 3 && (
                  <span className="text-[9px] text-gray-400 leading-none">+{daySchedules.length - 3}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 bg-gray-50/50 border-b flex-wrap">
        {[
          { label: "Completed", cls: "bg-green-500" },
          { label: "Checked In", cls: "bg-blue-500" },
          { label: "Scheduled", cls: "bg-indigo-400" },
          { label: "Pending", cls: "bg-yellow-400" },
          { label: "Rejected", cls: "bg-red-400" },
        ].map(({ label, cls }) => (
          <span key={label} className="flex items-center gap-1 text-[10px] text-gray-500">
            <span className={`w-2 h-2 rounded-full ${cls}`} />
            {label}
          </span>
        ))}
      </div>

      {/* Day detail panel */}
      {selectedDay && (
        <div className="px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">
            {new Date(parsedYear, parsedMonthIdx, selectedDay).toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h3>

          {selectedDaySchedules.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No sessions on this day</p>
          ) : (
            <div className="space-y-2">
              {selectedDaySchedules.map((s) => (
                <div
                  key={s.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50"
                >
                  <span className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${getDotClass(s.status)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">Day {s.dayNumber} — {s.college}</p>
                    <p className="text-xs text-gray-500">{s.time}</p>
                    <span className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.ui?.badge?.className || "bg-gray-100 text-gray-600"}`}>
                      {s.ui?.badge?.label || s.status}
                    </span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {s.ui?.primaryAction?.kind === "checkin" && (
                      <button
                        onClick={() => onOpenCheckIn(s)}
                        className="px-2 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        Check In
                      </button>
                    )}
                    {s.ui?.primaryAction?.kind === "checkout" && (
                      <button
                        onClick={() => onOpenCheckOut(s)}
                        className={`px-2 py-1 text-xs text-white rounded-lg ${
                          s.ui?.isInProgress ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                        }`}
                      >
                        Check Out
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {schedules.length === 0 && (
        <div className="py-10 text-center text-sm text-gray-400">
          No sessions scheduled for this month.
        </div>
      )}
    </div>
  );
}

export default memo(ScheduleCalendarView);
