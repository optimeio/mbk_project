"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import {
  Search, Download, FileText, Calendar, IndianRupee,
  ChevronLeft, ChevronRight, User, CheckCircle, Clock
} from "lucide-react";

const PAGE_SIZE = 15;
const formatCurrency = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function AccountantPayslips() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const { data, isPending } = useQuery({
    queryKey: ["accountant-payslips", page, debouncedSearch, selectedMonth, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: PAGE_SIZE });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (selectedMonth) params.set("month", selectedMonth);
      if (statusFilter) params.set("status", statusFilter);
      return api.get(`/salaries/payslips?${params}`);
    },
    staleTime: 60000,
    placeholderData: (prev) => prev,
  });

  const payslips = data?.payslips || data || [];
  const pagination = data?.pagination || {};
  const totalPages = pagination.totalPages || 1;

  const handleExportAll = () => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (selectedMonth) params.set("month", selectedMonth);
    if (statusFilter) params.set("status", statusFilter);
    params.set("format", "xlsx");
    window.open(`/api/salaries/payslips/export?${params}`, "_blank");
  };

  const handleDownload = async (slipId, trainerName, period) => {
    try {
      const blob = await api.get(`/salaries/payslips/${slipId}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payslip_${trainerName}_${period}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // fallback: open in new tab
      window.open(`/api/salaries/payslips/${slipId}/pdf`, "_blank");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payslips</h1>
          <p className="text-sm text-gray-500 mt-0.5">View and download all trainer payslips</p>
        </div>
        <button
          onClick={handleExportAll}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export All
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search trainer name or email..."
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => { setSelectedMonth(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Status</option>
          <option value="sent">Sent</option>
          <option value="pending">Pending</option>
          <option value="downloaded">Downloaded</option>
        </select>
      </div>

      {/* Payslip Cards */}
      {isPending ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32" />
                  <div className="h-3 bg-gray-100 rounded w-20" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 rounded" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : payslips.length === 0 ? (
        <div className="bg-white rounded-2xl py-20 flex flex-col items-center text-gray-400 shadow-sm border border-gray-100">
          <FileText className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium">No payslips found</p>
          <p className="text-sm mt-1">Generate payslips from Salary Review</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {payslips.map((slip) => (
            <div key={slip._id || slip.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{slip.trainerName || "Trainer"}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {slip.month} {slip.year}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  slip.status === "sent" || slip.status === "downloaded"
                    ? "bg-green-50 text-green-700"
                    : "bg-yellow-50 text-yellow-700"
                }`}>
                  {slip.status === "sent" || slip.status === "downloaded"
                    ? <CheckCircle className="w-3 h-3" />
                    : <Clock className="w-3 h-3" />
                  }
                  {slip.status || "pending"}
                </span>
              </div>

              {/* Salary breakdown */}
              <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-3 gap-2 text-center text-xs mb-4">
                <div>
                  <p className="text-gray-400 mb-0.5">Basic</p>
                  <p className="font-semibold text-gray-800">{formatCurrency(slip.basicSalary)}</p>
                </div>
                <div className="border-x border-gray-200">
                  <p className="text-gray-400 mb-0.5">Extras</p>
                  <p className="font-semibold text-green-600">+{formatCurrency(slip.allowances)}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-0.5">Deductions</p>
                  <p className="font-semibold text-red-500">-{formatCurrency(slip.deductions)}</p>
                </div>
              </div>

              {/* Net + action */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Net Salary</p>
                  <p className="text-xl font-bold text-indigo-700">{formatCurrency(slip.netSalary)}</p>
                </div>
                <button
                  onClick={() => handleDownload(slip._id || slip.id, slip.trainerName, `${slip.month}-${slip.year}`)}
                  className="flex items-center gap-2 px-3 py-2 text-xs bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-xl border border-gray-200 hover:bg-white disabled:opacity-40">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-600">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="p-2 rounded-xl border border-gray-200 hover:bg-white disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
