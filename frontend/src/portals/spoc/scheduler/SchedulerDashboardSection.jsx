"use client";

import React from "react";
import { Activity, Calendar as CalendarIcon } from "lucide-react";

import SchedulerExportControls from "./SchedulerExportControls";

const SchedulerDashboardSection = ({
  liveSchedules,
  lastUpdated,
  onExportLiveExcel,
  onExportLivePdf,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end mb-6 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-serif text-gray-800 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-gray-500" />
            Live Training Monitoring
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Real-time status for{" "}
            {new Date().toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="text-xs text-gray-500 border border-gray-200 bg-gray-50 px-3 py-1 rounded">
          Last Updated: {lastUpdated.toLocaleTimeString()}
        </div>
      </div>

      <div className="w-full">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-2">
            <h3 className="font-serif text-lg text-gray-800">Session Overview</h3>
            <SchedulerExportControls
              onExportExcel={onExportLiveExcel}
              onExportPdf={onExportLivePdf}
            />
          </div>

          {liveSchedules.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      College
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Course
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trainer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trainer ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {liveSchedules.map((schedule) => (
                    <tr
                      key={schedule._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-gray-600 bg-gray-50/50">
                        {schedule.startTime} - {schedule.endTime}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-gray-800">
                        {schedule.collegeId?.name}
                      </td>
                      <td className="px-4 py-3 text-xs text-blue-700 font-medium">
                        {schedule.courseId?.title}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {schedule.companyId?.name}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-900">
                        {schedule.trainerId?.name || schedule.trainerId?.userId?.name || (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                        {schedule.trainerId?.trainerId ||
                          schedule.trainerId?._id?.slice(-6)?.toUpperCase() ||
                          "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 text-xs border rounded ${
                            (schedule.liveStatus?.status || schedule.status) === "Present" ||
                            (schedule.liveStatus?.status || schedule.status) === "Completed"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : (schedule.liveStatus?.status || schedule.status) === "Late"
                                ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                : (schedule.liveStatus?.status || schedule.status) === "In Progress"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-gray-50 text-gray-600 border-gray-200"
                          }`}
                        >
                          {schedule.liveStatus?.status || schedule.status || "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border border-dashed border-gray-300 rounded p-12 text-center bg-gray-50">
              <CalendarIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No sessions scheduled for today</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchedulerDashboardSection;
