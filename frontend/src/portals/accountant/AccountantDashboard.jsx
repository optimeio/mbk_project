"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/services/api";
import {
  IndianRupee, FileText, Users, TrendingUp, Clock,
  CheckCircle, AlertCircle, Download, ArrowRight,
  BarChart3, CreditCard, Building2, ArrowUpRight
} from "lucide-react";

const formatCurrency = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const StatCard = ({ label, value, icon: Icon, color, link, sub }) => (
  <Link href={link || "#"} className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-100 transition-all flex items-center gap-4">
    <div className={`p-3 rounded-xl shrink-0 ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm text-gray-500 truncate">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
  </Link>
);

const QuickAction = ({ label, desc, href, icon: Icon, color }) => (
  <Link href={href}
    className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-100 transition-all">
    <div className={`inline-flex p-2.5 rounded-xl mb-3 ${color}`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <h3 className="font-semibold text-gray-900 text-sm">{label}</h3>
    <p className="text-xs text-gray-500 mt-1">{desc}</p>
  </Link>
);

export default function AccountantDashboard() {
  const { data: stats, isPending } = useQuery({
    queryKey: ["accountant-dashboard-stats"],
    queryFn: () => api.get("/salaries/dashboard-stats"),
    staleTime: 120000,
  });

  const { data: recentSlips } = useQuery({
    queryKey: ["accountant-recent-payslips"],
    queryFn: () => api.get("/salaries/payslips?limit=5&sort=-createdAt"),
    staleTime: 60000,
  });

  const currentMonth = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Accountant Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          {currentMonth} — Financial overview and pending tasks
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Disbursed (Month)"
          value={isPending ? "—" : formatCurrency(stats?.monthlyDisbursed)}
          icon={IndianRupee}
          color="bg-indigo-500"
          link="/accountant/salary"
          sub={isPending ? "" : `${stats?.paidCount || 0} trainers`}
        />
        <StatCard
          label="Pending Approvals"
          value={isPending ? "—" : stats?.pendingApprovals || 0}
          icon={Clock}
          color="bg-yellow-500"
          link="/accountant/salary"
          sub="Awaiting review"
        />
        <StatCard
          label="Payslips Sent"
          value={isPending ? "—" : stats?.payslipsSent || 0}
          icon={FileText}
          color="bg-green-500"
          link="/accountant/payslips"
          sub="This month"
        />
        <StatCard
          label="Bank Details"
          value={isPending ? "—" : stats?.totalTrainers || 0}
          icon={Building2}
          color="bg-blue-500"
          link="/accountant/bank-details"
          sub="Active trainers"
        />
      </div>

      {/* Quick Actions */}
      <h2 className="text-base font-semibold text-gray-800 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <QuickAction
          label="Review Salaries"
          desc="Approve or reject pending salary calculations"
          href="/accountant/salary"
          icon={IndianRupee}
          color="bg-indigo-500"
        />
        <QuickAction
          label="View Payslips"
          desc="Browse and download all trainer payslips"
          href="/accountant/payslips"
          icon={FileText}
          color="bg-green-500"
        />
        <QuickAction
          label="Financial Reports"
          desc="Monthly trends, disbursements, and analytics"
          href="/accountant/reports"
          icon={BarChart3}
          color="bg-blue-500"
        />
        <QuickAction
          label="Bank Details"
          desc="View trainer bank account information"
          href="/accountant/bank-details"
          icon={CreditCard}
          color="bg-purple-500"
        />
      </div>

      {/* Recent Payslips */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Payslips</h2>
          <Link href="/accountant/payslips" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {!recentSlips?.payslips?.length ? (
          <div className="py-12 text-center text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No recent payslips</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {(recentSlips.payslips || []).slice(0, 5).map((slip) => (
              <div key={slip._id || slip.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600">
                    {(slip.trainerName || "T")[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{slip.trainerName || "Trainer"}</p>
                    <p className="text-xs text-gray-400">{slip.month} {slip.year}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(slip.netSalary)}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    slip.status === "sent" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
                  }`}>{slip.status || "pending"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
