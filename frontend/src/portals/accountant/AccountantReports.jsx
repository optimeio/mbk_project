"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import {
  BarChart3, Download, TrendingUp, TrendingDown, IndianRupee,
  Calendar, Users, FileSpreadsheet, RefreshCw, ArrowUpRight, ArrowDownRight
} from "lucide-react";

const formatCurrency = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const formatPct = (n) => `${Number(n || 0).toFixed(1)}%`;

export default function AccountantReports() {
  const [period, setPeriod] = useState("month");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const { data: reportData, isPending, refetch } = useQuery({
    queryKey: ["accountant-reports", period, selectedYear],
    queryFn: async () => {
      const params = new URLSearchParams({ period, year: selectedYear });
      return api.get(`/salaries/reports?${params}`);
    },
    staleTime: 120000,
  });

  const { data: monthlyData } = useQuery({
    queryKey: ["accountant-monthly-trend", selectedYear],
    queryFn: async () => api.get(`/salaries/trend?year=${selectedYear}`),
    staleTime: 300000,
  });

  const report = reportData || {};
  const trend = monthlyData?.trend || [];

  const handleExcelExport = () => {
    const params = new URLSearchParams({ period, year: selectedYear, format: "xlsx" });
    window.open(`/api/salaries/reports/export?${params}`, "_blank");
  };

  const handlePdfExport = () => {
    const params = new URLSearchParams({ period, year: selectedYear, format: "pdf" });
    window.open(`/api/salaries/reports/export?${params}`, "_blank");
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 4 }, (_, i) => (currentYear - i).toString());

  const months = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec"
  ];

  const maxTrendValue = Math.max(...trend.map((t) => t.total || 0), 1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Salary trends, disbursements, and analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => refetch()} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          <button onClick={handleExcelExport}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors">
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>
          <button
            onClick={handlePdfExport}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Period controls */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {["month", "quarter", "year"].map((p) => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-4 py-2 text-sm rounded-xl font-medium transition-colors ${
              period === p ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
        <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
          className="ml-auto px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500">
          {years.map((y) => <option key={y}>{y}</option>)}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Disbursed", value: formatCurrency(report.totalDisbursed), icon: IndianRupee, delta: report.disbursedDelta, color: "bg-indigo-500" },
          { label: "Trainers Paid", value: report.paidCount || "—", icon: Users, delta: report.paidDelta, color: "bg-blue-500" },
          { label: "Avg Per Trainer", value: formatCurrency(report.avgSalary), icon: TrendingUp, delta: report.avgDelta, color: "bg-green-500" },
          { label: "Pending Payout", value: formatCurrency(report.pendingAmount), icon: Calendar, delta: null, color: "bg-yellow-500" },
        ].map(({ label, value, icon: Icon, delta, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${color}`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              {delta !== null && delta !== undefined && (
                <span className={`flex items-center gap-0.5 text-xs font-medium ${delta >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {delta >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {Math.abs(delta).toFixed(1)}%
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Monthly Trend Chart */}
      {trend.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900">Monthly Disbursement Trend</h2>
            <span className="text-sm text-gray-400">{selectedYear}</span>
          </div>
          <div className="flex items-end gap-3 h-48">
            {months.map((m, idx) => {
              const monthData = trend.find((t) => t.month === idx + 1);
              const value = monthData?.total || 0;
              const height = maxTrendValue > 0 ? (value / maxTrendValue) * 100 : 0;
              const isCurrentMonth = idx + 1 === new Date().getMonth() + 1 &&
                selectedYear === currentYear.toString();
              return (
                <div key={m} className="flex-1 flex flex-col items-center gap-1.5">
                  <p className="text-[10px] text-gray-400 rotate-[-30deg] origin-center truncate w-full text-center">
                    {value > 0 ? `₹${Math.round(value / 1000)}K` : ""}
                  </p>
                  <div className="w-full flex flex-col justify-end" style={{ height: "140px" }}>
                    <div
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        isCurrentMonth ? "bg-indigo-600" : "bg-indigo-200 hover:bg-indigo-400"
                      }`}
                      style={{ height: `${Math.max(height, value > 0 ? 4 : 0)}%` }}
                      title={`${m}: ${formatCurrency(value)}`}
                    />
                  </div>
                  <p className={`text-[11px] font-medium ${isCurrentMonth ? "text-indigo-600" : "text-gray-400"}`}>{m}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary Table */}
      {report.breakdown && report.breakdown.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold text-gray-900">Salary Breakdown</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-6 py-3 font-medium text-gray-600">Period</th>
                <th className="text-right px-6 py-3 font-medium text-gray-600">Trainers</th>
                <th className="text-right px-6 py-3 font-medium text-gray-600">Total Disbursed</th>
                <th className="text-right px-6 py-3 font-medium text-gray-600">Avg Salary</th>
                <th className="text-right px-6 py-3 font-medium text-gray-600">Deductions</th>
                <th className="text-center px-6 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {report.breakdown.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3 font-medium text-gray-900">{row.period}</td>
                  <td className="px-6 py-3 text-right text-gray-600">{row.count}</td>
                  <td className="px-6 py-3 text-right font-semibold text-gray-900">{formatCurrency(row.total)}</td>
                  <td className="px-6 py-3 text-right text-gray-600">{formatCurrency(row.avg)}</td>
                  <td className="px-6 py-3 text-right text-red-500">-{formatCurrency(row.deductions)}</td>
                  <td className="px-6 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      row.status === "completed" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
                    }`}>{row.status || "—"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
