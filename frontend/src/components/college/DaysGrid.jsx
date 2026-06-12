"use client";

import { UserIcon, ClockIcon, CheckCircleIcon, MapPinIcon, DocumentIcon } from "@heroicons/react/24/outline";

const DaysGrid = ({ days, department = "General", onDayClick }) => {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{department} Training Days</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {days.map((day) => {
          const isTrainerAssigned = !!(day.trainerName || day.trainer?.name);
          const trainerName = isTrainerAssigned ? (day.trainerName || day.trainer?.name) : "Not Assigned";
          const timeRange = day.startTime && day.endTime
            ? `${day.startTime} - ${day.endTime}`
            : (day.time || "09:00 - 17:00");

          const status = day.status || "Pending";
          const hasAttendance = typeof day.hasAttendanceDocs === "boolean"
            ? day.hasAttendanceDocs
            : !!day.attendancePdfUrl || !!day.attendanceExcelUrl;
          const docsStatusLabel = day.docsStatusLabel || (hasAttendance ? "Docs Uploaded" : "Pending");
          const normalizedGeoStatus = String(day.geoVerificationStatus || "").trim().toLowerCase();
          const geoStatusLabel = day.geoStatusLabel || (
            normalizedGeoStatus === "approved"
              ? "Geo Verified"
              : normalizedGeoStatus === "rejected"
                ? "Geo Rejected"
                : "Geo Pending"
          );

          const statusStyles = {
            Pending: "bg-amber-50 text-amber-700 border-amber-200",
            InProgress: "bg-blue-50 text-blue-700 border-blue-200",
            Active: "bg-blue-50 text-blue-700 border-blue-200",
            Completed: "bg-emerald-50 text-emerald-700 border-emerald-200"
          };

          return (
            <div
              key={day.id || day.dayNumber}
              onClick={() => onDayClick(day)}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 p-5 flex flex-col justify-between group cursor-pointer"
            >
              <div className="flex-1">
                {/* Header */}
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {day.name || `Day ${day.dayNumber}`}
                  </h3>

                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      statusStyles[status] || statusStyles.Pending
                    }`}
                  >
                    {status === 'Completed' ? '🟢 ' : status === 'Pending' ? '🟠 ' : '🔵 ' }
                    {status}
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Trainer */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                      <UserIcon className="w-5 h-5 text-slate-400" />
                    </div>

                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1.5">Trainer</p>
                      <p className={`text-sm font-semibold truncate ${!isTrainerAssigned ? 'text-gray-400 italic' : 'text-gray-900'}`}>
                        {trainerName}
                      </p>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                      <ClockIcon className="w-5 h-5 text-slate-400" />
                    </div>

                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1.5">Schedule</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {timeRange}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Micro-Indicators / Progress Badges */}
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                      isTrainerAssigned ? "bg-indigo-50 border-indigo-100 text-indigo-600" : "bg-gray-50 border-gray-100 text-gray-400"
                  }`}>
                      <UserIcon className="w-3 h-3" strokeWidth={2.5} />
                      {isTrainerAssigned ? "Trainer Assigned" : "No Trainer"}
                  </span>
                  
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                      hasAttendance ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-gray-50 border-gray-100 text-gray-400"
                  }`}>
                      <DocumentIcon className="w-3 h-3" strokeWidth={2.5} />
                      {docsStatusLabel}
                  </span>

                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                      geoStatusLabel === "Geo Verified"
                        ? "bg-blue-50 border-blue-100 text-blue-600"
                        : geoStatusLabel === "Geo Manual Review"
                          ? "bg-amber-50 border-amber-100 text-amber-700"
                        : geoStatusLabel === "Geo Rejected"
                          ? "bg-rose-50 border-rose-100 text-rose-600"
                          : "bg-gray-50 border-gray-100 text-gray-400"
                  }`}>
                      <MapPinIcon className="w-3 h-3" strokeWidth={2.5} />
                      {geoStatusLabel}
                  </span>
                </div>
              </div>

              {/* Action */}
              <div className="mt-5 pt-4 border-t border-gray-100/60">
                <button className="w-full bg-indigo-50/50 text-indigo-600 text-sm font-bold py-2.5 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                  View full details
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DaysGrid;
