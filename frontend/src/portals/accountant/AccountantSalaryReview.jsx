"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { notify } from "@/lib/toast";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import {
  Search, Download, Filter, ChevronLeft, ChevronRight,
  CheckCircle, Clock, AlertCircle, IndianRupee, TrendingUp,
  FileText, RefreshCw, Eye, X, User, Calendar, Banknote
} from "lucide-react";

const PAGE_SIZE = 20;

const STATUS_BADGE = {
  pending:    { bg: "bg-yellow-50 text-yellow-700 ring-yellow-600/20", label: "Pending" },
  approved:   { bg: "bg-green-50 text-green-700 ring-green-600/20", label: "Approved" },
  processing: { bg: "bg-blue-50 text-blue-700 ring-blue-600/20", label: "Processing" },
  paid:       { bg: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", label: "Paid" },
  rejected:   { bg: "bg-red-50 text-red-700 ring-red-600/20", label: "Rejected" },
};

const formatCurrency = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const StatCard = ({ label, value, icon: Icon, color, sub }) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4">
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

export default function AccountantSalaryReview() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedSalary, setSelectedSalary] = useState(null);
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const queryClient = useQueryClient();

  const { data, isPending, isFetching } = useQuery({
    queryKey: ["accountant-salaries", page, debouncedSearch, statusFilter, selectedMonth],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: PAGE_SIZE });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter) params.set("status", statusFilter);
      if (selectedMonth) params.set("month", selectedMonth);
      return api.get(`/salaries?${params}`);
    },
    staleTime: 30000,
    placeholderData: (prev) => prev,
  });

  const { data: statsData } = useQuery({
    queryKey: ["accountant-salary-stats", selectedMonth],
    queryFn: async () => {
      const params = selectedMonth ? `?month=${selectedMonth}` : "";
      return api.get(`/salaries/stats${params}`);
    },
    staleTime: 60000,
  });

  const approveMutation = useMutation({
    mutationFn: (salaryId) => api.put(`/salaries/${salaryId}/approve`),
    onSuccess: () => {
      notify.success("Salary approved successfully");
      queryClient.invalidateQueries({ queryKey: ["accountant-salaries"] });
      setSelectedSalary(null);
    },
    onError: (err) => notify.error(err.message || "Failed to approve salary"),
  });

  const sendPayslipMutation = useMutation({
    mutationFn: (salaryId) => api.post(`/salaries/${salaryId}/send-payslip`),
    onSuccess: () => {
      notify.success("Payslip sent to trainer");
      queryClient.invalidateQueries({ queryKey: ["accountant-salaries"] });
    },
    onError: (err) => notify.error(err.message || "Failed to send payslip"),
  });

  const handleExport = () => {
    const params = new URLSearchParams({ page: 1, limit: 10000 });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter) params.set("status", statusFilter);
    if (selectedMonth) params.set("month", selectedMonth);
    params.set("format", "xlsx");
    window.open(`/api/salaries/export?${params}`, "_blank");
  };

  const salaries = data?.salaries || data || [];
  const pagination = data?.pagination || {};
  const stats = statsData || {};

  const totalPages = pagination.totalPages || Math.ceil((pagination.total || salaries.length) / PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Salary Review</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review, approve, and send payslips to trainers</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["accountant-salaries"] })}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Disbursement" value={formatCurrency(stats.totalDisbursed)} icon={IndianRupee} color="bg-indigo-500" sub={stats.processedCount ? `${stats.processedCount} trainers` : undefined} />
        <StatCard label="Pending Approval" value={stats.pendingCount || 0} icon={Clock} color="bg-yellow-500" sub="Awaiting review" />
        <StatCard label="Approved" value={stats.approvedCount || 0} icon={CheckCircle} color="bg-green-500" sub="Ready to pay" />
        <StatCard label="Average Salary" value={formatCurrency(stats.avgSalary)} icon={TrendingUp} color="bg-blue-500" sub="Per trainer" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search trainer..."
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
        </select>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => { setSelectedMonth(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isPending ? (
          <div className="divide-y">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-40" />
                  <div className="h-3 bg-gray-100 rounded w-24" />
                </div>
                <div className="w-24 h-6 bg-gray-100 rounded-full" />
                <div className="w-20 h-4 bg-gray-200 rounded" />
                <div className="w-24 h-8 bg-gray-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : salaries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <IndianRupee className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">No salary records found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/80">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Trainer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Period</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Basic</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Allowances</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Deductions</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 bg-indigo-50/50">Net Salary</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {salaries.map((s) => {
                const badge = STATUS_BADGE[s.status] || STATUS_BADGE.pending;
                return (
                  <tr key={s._id || s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{s.trainerName || "—"}</p>
                      <p className="text-xs text-gray-400">{s.trainerEmail || s.trainerId}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{s.month} {s.year}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(s.basicSalary)}</td>
                    <td className="px-4 py-3 text-right text-green-600">{formatCurrency(s.allowances)}</td>
                    <td className="px-4 py-3 text-right text-red-500">-{formatCurrency(s.deductions)}</td>
                    <td className="px-4 py-3 text-right font-bold text-indigo-700 bg-indigo-50/30">{formatCurrency(s.netSalary)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedSalary(s)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        {(s.status === "pending" || s.status === "processing") && (
                          <button
                            onClick={() => approveMutation.mutate(s._id || s.id)}
                            disabled={approveMutation.isPending}
                            className="px-3 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                          >
                            Approve
                          </button>
                        )}
                        {s.status === "approved" && (
                          <button
                            onClick={() => sendPayslipMutation.mutate(s._id || s.id)}
                            disabled={sendPayslipMutation.isPending}
                            className="px-3 py-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
                          >
                            Send Slip
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50/40">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, pagination.total || 0)} of {pagination.total || 0}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium px-2">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Salary Detail Modal */}
      {selectedSalary && (
        <div className="dashboard-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="dashboard-modal-panel w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-900">Salary Details</h2>
              <button
                onClick={() => setSelectedSalary(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Trainer info */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{selectedSalary.trainerName || "—"}</p>
                  <p className="text-sm text-gray-400">{selectedSalary.trainerEmail || selectedSalary.trainerId || "—"}</p>
                </div>
                <span className={`ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                  (STATUS_BADGE[selectedSalary.status] || STATUS_BADGE.pending).bg
                }`}>
                  {(STATUS_BADGE[selectedSalary.status] || STATUS_BADGE.pending).label}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>Period: <span className="font-medium text-gray-800">{selectedSalary.month} {selectedSalary.year}</span></span>
              </div>

              {/* Breakdown */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                {[
                  { label: "Basic Salary", value: selectedSalary.basicSalary, color: "text-gray-900" },
                  { label: "Allowances", value: selectedSalary.allowances, color: "text-green-600", prefix: "+" },
                  { label: "Deductions", value: selectedSalary.deductions, color: "text-red-500", prefix: "-" },
                ].map(({ label, value, color, prefix }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className={`font-medium ${color}`}>
                      {prefix}₹{Number(value || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
                <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                  <span className="font-semibold text-gray-800">Net Salary</span>
                  <span className="text-lg font-bold text-indigo-700">
                    ₹{Number(selectedSalary.netSalary || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {selectedSalary.notes && (
                <p className="text-xs text-gray-500 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
                  {selectedSalary.notes}
                </p>
              )}
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t bg-gray-50/50 flex items-center gap-3 justify-end">
              {(selectedSalary.status === "pending" || selectedSalary.status === "processing") && (
                <button
                  onClick={() => approveMutation.mutate(selectedSalary._id || selectedSalary.id)}
                  disabled={approveMutation.isPending}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  Approve
                </button>
              )}
              {selectedSalary.status === "approved" && (
                <button
                  onClick={() => sendPayslipMutation.mutate(selectedSalary._id || selectedSalary.id)}
                  disabled={sendPayslipMutation.isPending}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  Send Payslip
                </button>
              )}
              <button
                onClick={() => window.open(`/api/salaries/payslips/${selectedSalary._id || selectedSalary.id}/pdf`, "_blank")}
                className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
              <button
                onClick={() => setSelectedSalary(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
