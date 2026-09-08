"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, BanknotesIcon } from "@heroicons/react/20/solid";

import useDebouncedValue from "@/hooks/useDebouncedValue";
import {
  FINANCIAL_DEFAULT_PAGE_SIZE,
  useFinancialRecordsQuery,
  useFinancialStatsQuery,
} from "@/modules/finance";

const PAGE_SIZE = FINANCIAL_DEFAULT_PAGE_SIZE;

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

const FinancialReports = ({ embedded = false }) => {
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, typeFilter]);

  const {
    data: recordsPayload,
    isPending: recordsLoading,
    isFetching: recordsRefreshing,
    error: recordsError,
  } = useFinancialRecordsQuery({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    status: statusFilter,
    type: typeFilter,
  });

  const {
    data: statsPayload,
    isPending: statsLoading,
    error: statsError,
  } = useFinancialStatsQuery();

  const records = recordsPayload?.records || [];
  const pagination = recordsPayload?.pagination || {
    page,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  };

  const transactions = useMemo(
    () =>
      records.map((record) => ({
        id: record?._id || record?.id,
        recipient: record?.trainerId?.userId?.name || "Unknown Trainer",
        type: record?.type || "N/A",
        amount: formatCurrency(record?.amount),
        date: record?.date ? new Date(record.date).toLocaleDateString() : "N/A",
        status: record?.status || "Unknown",
      })),
    [records],
  );

  const stats = useMemo(() => {
    const successCount = Number(statsPayload?.byStatus?.Success?.count || 0);
    const averageSalary =
      successCount > 0 ? Number(statsPayload?.successAmount || 0) / successCount : 0;

    return [
      {
        name: "Total Trainer Payouts",
        stat: formatCurrency(statsPayload?.successAmount),
        previousStat: "Based on successful payouts",
        change: `${successCount} records`,
        changeType: "increase",
      },
      {
        name: "Pending Salaries",
        stat: formatCurrency(statsPayload?.pendingAmount),
        previousStat: "Pending approvals",
        change: `${Number(statsPayload?.byStatus?.Pending?.count || 0)} records`,
        changeType: "decrease",
      },
      {
        name: "Avg. Trainer Salary",
        stat: formatCurrency(averageSalary),
        previousStat: "Success payouts only",
        change: `${Number(statsPayload?.totalRecords || 0)} total records`,
        changeType: "increase",
      },
    ];
  }, [statsPayload]);

  const totalPages = Math.max(Number(pagination.totalPages || 0), 1);
  const safeCurrentPage = Number(pagination.page || page);

  return (
    <div className={embedded ? "p-0" : "px-4 py-8 sm:px-6 lg:px-8 bg-gray-50 min-h-screen"}>
      {(recordsError || statsError) && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800">
          <p className="text-sm">
            {recordsError?.message || statsError?.message || "Failed to load financial data"}
          </p>
        </div>
      )}

      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          {!embedded && (
            <>
              <h1 className="text-2xl font-bold text-gray-900">Trainer Financial Reports</h1>
              <p className="mt-2 text-sm text-gray-700">
                Overview of trainer payouts, salaries, and reimbursements.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-lg bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            type="search"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            placeholder="Search by status, type, or description"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <select
            className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All status</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Success">Success</option>
            <option value="Failed">Failed</option>
          </select>
          <select
            className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="">All types</option>
            <option value="Salary">Salary</option>
            <option value="Bonus">Bonus</option>
            <option value="Reimbursement">Reimbursement</option>
            <option value="Advance">Advance</option>
          </select>
        </div>
      </div>

      {recordsRefreshing ? (
        <p className="mt-2 text-xs text-gray-500">Refreshing records...</p>
      ) : null}

      {statsLoading ? (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`stat-skeleton-${index}`} className="h-28 animate-pulse rounded-lg bg-white shadow" />
          ))}
        </div>
      ) : (
        <dl className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {stats.map((item) => (
            <div key={item.name} className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
              <dt className="truncate text-sm font-medium text-gray-500">{item.name}</dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">{item.stat}</dd>
              <dd className="mt-2 flex items-center text-sm text-gray-500">
                {item.changeType === "increase" ? (
                  <ArrowUpIcon className="h-5 w-5 flex-shrink-0 text-green-500" aria-hidden="true" />
                ) : (
                  <ArrowDownIcon className="h-5 w-5 flex-shrink-0 text-red-500" aria-hidden="true" />
                )}
                <span
                  className={classNames(
                    item.changeType === "increase" ? "text-green-600" : "text-red-600",
                    "ml-2 font-medium",
                  )}
                >
                  {item.change}
                </span>
                <span className="ml-2">{item.previousStat}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow sm:rounded-lg">
          <h3 className="mb-4 text-base font-semibold leading-6 text-gray-900">
            Monthly Trainer Payout Trend
          </h3>
          <div className="relative flex h-64 w-full items-end justify-between space-x-2 px-2">
            {[35, 45, 30, 60, 55, 70, 65, 80, 75, 60, 85, 90].map((height, idx) => (
              <div key={`trend-${idx}`} className="group relative w-full rounded-t-md bg-indigo-50">
                <div
                  style={{ height: `${height}%` }}
                  className="absolute bottom-0 w-full rounded-t-md bg-indigo-500 transition-all duration-500 group-hover:bg-indigo-600"
                />
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 transform text-xs text-gray-500">
                  {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][idx]}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow sm:rounded-lg">
          <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
            <h3 className="text-base font-semibold leading-6 text-gray-900">Recent Transactions</h3>
          </div>
          {recordsLoading && transactions.length === 0 ? (
            <div className="space-y-2 px-4 py-4 sm:px-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={`transaction-skeleton-${index}`} className="h-12 animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="px-4 py-8 text-sm text-gray-500 sm:px-6">
              No financial records found for the selected filters.
            </div>
          ) : (
            <ul role="list" className="divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <li key={transaction.id} className="px-4 py-4 hover:bg-gray-50 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                          <BanknotesIcon className="h-6 w-6 text-gray-500" aria-hidden="true" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="truncate text-sm font-medium text-indigo-600">{transaction.recipient}</p>
                        <p className="text-xs text-gray-500">
                          {transaction.type} • {transaction.status}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <p className="text-sm font-medium text-gray-900">{transaction.amount}</p>
                      <p className="text-xs text-gray-500">{transaction.date}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-4 sm:px-6">
            <p className="text-sm text-gray-500">
              Page {safeCurrentPage} of {totalPages} ({pagination.total} total)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={!pagination.hasPrevPage}
              >
                Previous
              </button>
              <button
                type="button"
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setPage((prev) => prev + 1)}
                disabled={!pagination.hasNextPage}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialReports;
