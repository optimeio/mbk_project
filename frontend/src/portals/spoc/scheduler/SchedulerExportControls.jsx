"use client";

import React from "react";
import { FileSpreadsheet, FileUp } from "lucide-react";

const SchedulerExportControls = ({
  onExportExcel,
  onExportPdf,
  excelLabel = "Excel",
  pdfLabel = "PDF",
  className = "",
}) => {
  return (
    <div className={`flex space-x-2 ${className}`.trim()}>
      <button
        onClick={onExportExcel}
        className="text-xs flex items-center px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 transition-colors"
      >
        <FileSpreadsheet className="w-3 h-3 mr-1" /> {excelLabel}
      </button>
      <button
        onClick={onExportPdf}
        className="text-xs flex items-center px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 transition-colors"
      >
        <FileUp className="w-3 h-3 mr-1" /> {pdfLabel}
      </button>
    </div>
  );
};

export default SchedulerExportControls;
