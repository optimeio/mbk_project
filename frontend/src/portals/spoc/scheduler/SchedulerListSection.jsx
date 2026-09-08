"use client";

import React from "react";
import { Profiler } from "react";
import { Clock, Pencil, Trash2 } from "lucide-react";

import {
  buildLoadedSessionsLabel,
  createAssignClickHandler,
  createDeleteClickHandler,
  resolveScheduleId,
  shouldShowLoadMore,
} from "./schedulerUiState";
import useSchedulerListRenderProfiler from "./useSchedulerListRenderProfiler";
import SchedulerExportControls from "./SchedulerExportControls";

const SchedulerListSection = ({
  schedules,
  schedulesPagination,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onExportListExcel,
  onExportListPdf,
  onOpenAssignModal,
  onDeleteSchedule,
}) => {
  const { onRender } = useSchedulerListRenderProfiler();

  return (
    <Profiler id="SchedulerListSection" onRender={onRender}>
      <div className="bg-white border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-serif text-gray-800">Training Itinerary</h2>
            <p className="text-sm text-gray-500">
              Comprehensive view of all assigned sessions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SchedulerExportControls
              onExportExcel={onExportListExcel}
              onExportPdf={onExportListPdf}
            />
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium border border-gray-200">
                {buildLoadedSessionsLabel({
                  loadedCount: schedules.length,
                  total: schedulesPagination?.total,
                })}
              </span>
              {shouldShowLoadMore({ hasNextPage }) ? (
                <button
                  type="button"
                  onClick={onLoadMore}
                  disabled={isFetchingNextPage}
                  className="text-xs flex items-center px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isFetchingNextPage ? "Loading..." : "Load More"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  College & Course
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trainer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trainer ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schedules.map((schedule) => (
                <tr
                  key={resolveScheduleId(schedule)}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {schedule.collegeId?.name || "N/A"}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {schedule.courseId?.title || "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {schedule.scheduledDate
                        ? new Date(schedule.scheduledDate).toLocaleDateString(
                          "en-GB",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )
                        : "Unscheduled"}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center mt-1">
                      <Clock className="w-3 h-3 mr-1 text-gray-400" />
                      {schedule.startTime} - {schedule.endTime}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {schedule.trainerId ? (
                      <div className="flex items-center">
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium mr-2">
                          {(
                            schedule.trainerId.name
                            || schedule.trainerId.userId?.name
                            || "?"
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm text-gray-900">
                            {schedule.trainerId.name || schedule.trainerId.userId?.name}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                    {schedule.trainerId?.trainerId
                      || schedule.trainerId?._id?.slice(-6)?.toUpperCase()
                      || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 text-xs border rounded ${
                        schedule.status?.toLowerCase() === "completed"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : schedule.status?.toLowerCase() === "scheduled"
                            || schedule.trainerId
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-gray-50 text-gray-600 border-gray-200"
                      }`}
                    >
                      {schedule.status === "completed"
                        ? "Done"
                        : schedule.trainerId
                          ? "Active"
                          : "Pending"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <button
                      onClick={createAssignClickHandler({
                        schedule,
                        onOpenAssignModal,
                      })}
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Assign
                    </button>
                    <button
                      onClick={createDeleteClickHandler({
                        schedule,
                        onDeleteSchedule,
                      })}
                      className="inline-flex items-center text-red-600 hover:text-red-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Profiler>
  );
};

export default SchedulerListSection;
