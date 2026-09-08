"use client";

import React from "react";
import { FileUp } from "lucide-react";

const SchedulerHeaderActions = ({ onOpenBulkModal }) => (
  <div className="flex justify-between items-center bg-white p-4 border-b border-gray-200 mb-6">
    <div>
      <h1 className="text-2xl font-serif text-gray-800">Trainer Schedule</h1>
      <p className="text-sm text-gray-600">
        Manage batches, assign trainers, and view timelines
      </p>
    </div>
    <div className="flex items-center space-x-3">
      <button
        onClick={onOpenBulkModal}
        className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 transition-all"
      >
        <FileUp className="w-4 h-4 mr-2" />
        Bulk Assign
      </button>
    </div>
  </div>
);

export default SchedulerHeaderActions;

