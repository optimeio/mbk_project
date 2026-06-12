"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Download, FileSpreadsheet } from "lucide-react";
import { api } from "@/services/api";

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const toMonthLabel = (month, year) => {
  if (!month || !year) return "-";
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

export default function AccountantStatements() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [exportingRow, setExportingRow] = useState(null);

  const handleExportYearly = () => {
    window.open(`/api/financial-records/statements/export?year=${year}&format=xlsx`, "_blank");
  };

  const handleDownloadRow = async (row) => {
    const key = `${row.year}-${row.month}`;
    setExportingRow(key);
    try {
      window.open(
        `/api/financial-records/statements/download?month=${row.month}&year=${row.year}`,
        "_blank"
      );
    } finally {
      setTimeout(() => setExportingRow(null), 1500);
    }
  };

  const { data, isPending } = useQuery({
    queryKey: ["accountant-statements", year],
    queryFn: async () => api.get(`/financial-records/statements?year=${year}`),
    staleTime: 60_000,
  });

  const statements = useMemo(() => {
    if (Array.isArray(data?.statements)) return data.statements;
    if (Array.isArray(data)) return data;
    return [];
  }, [data]);

  const totals = useMemo(() => {
    return statements.reduce(
      (acc, row) => {
        acc.gross += Number(row.grossAmount || 0);
        acc.net += Number(row.netAmount || 0);
        acc.deductions += Number(row.deductions || 0);
        return acc;
      },
      { gross: 0, net: 0, deductions: 0 }
    );
  }, [statements]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monthly Statements</h1>
          <p className="text-sm text-gray-500 mt-1">
            Consolidated salary statement summary by month.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            onClick={handleExportYearly}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Yearly
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500">Gross Total</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totals.gross)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500">Deductions</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totals.deductions)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500">Net Paid</p>
          <p className="text-xl font-bold text-indigo-700">{formatCurrency(totals.net)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isPending ? (
          <div className="p-6 text-sm text-gray-500">Loading statements...</div>
        ) : statements.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            No monthly statements found for {year}.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-5 py-3 font-medium text-gray-600">Month</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Gross</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Deductions</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Net</th>
                <th className="text-center px-5 py-3 font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {statements.map((row, idx) => (
                <tr key={row._id || `${row.month}-${idx}`} className="hover:bg-gray-50/40">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    <span className="inline-flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {toMonthLabel(row.month, row.year)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">{formatCurrency(row.grossAmount)}</td>
                  <td className="px-5 py-3 text-right text-red-600">
                    {formatCurrency(row.deductions)}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-indigo-700">
                    {formatCurrency(row.netAmount)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => handleDownloadRow(row)}
                      disabled={exportingRow === `${row.year}-${row.month}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {exportingRow === `${row.year}-${row.month}` ? "…" : "Download"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
