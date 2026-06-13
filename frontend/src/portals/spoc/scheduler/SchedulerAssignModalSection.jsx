"use client";

import React from "react";

const SchedulerAssignModalSection = ({
  show,
  assignData,
  trainers,
  onSubmit,
  onClose,
  onTrainerChange,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
  onReasonChange,
}) => {
  if (!show) return null;

  return (
    <div className="dashboard-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="dashboard-modal-panel w-full max-w-md border border-gray-300 bg-white shadow-lg">
        <div className="bg-gray-50 p-6 border-b border-gray-200">
          <h2 className="text-xl font-serif text-gray-800">Reschedule / Assign</h2>
          <p className="text-gray-500 text-sm mt-1">Set date and time for this session</p>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trainer</label>
            <select
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
              value={assignData.trainerId}
              onChange={onTrainerChange}
            >
              <option value="">Select Trainer</option>
              {trainers.map((trainer) => (
                <option
                  key={trainer.id || trainer._id}
                  value={trainer.id || trainer._id}
                >
                  {trainer.userId?.name || trainer.name || "Unknown"} (
                  {trainer.specialization || "General"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Session Date</label>
            <input
              type="date"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
              value={assignData.scheduledDate}
              onChange={onDateChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                value={assignData.startTime}
                onChange={onStartTimeChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                value={assignData.endTime}
                onChange={onEndTimeChange}
              />
            </div>
          </div>

          {assignData.trainerId ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Reschedule</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                placeholder="e.g., Room unavailability, Trainer request..."
                rows={2}
                value={assignData.rescheduleReason}
                onChange={onReasonChange}
              />
            </div>
          ) : null}

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-all"
            >
              Confirm Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SchedulerAssignModalSection;
