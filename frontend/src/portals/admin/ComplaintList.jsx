"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, DatePicker, Input, Select, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";

import useDebouncedValue from "@/hooks/useDebouncedValue";
import {
  COMPLAINT_DEFAULT_PAGE_SIZE,
  getComplaintListQueryOptions,
  useComplaintListQuery,
} from "@/modules/complaints";

const { Option } = Select;
const PAGE_SIZE = COMPLAINT_DEFAULT_PAGE_SIZE;

const getStatusColor = (status = "") => {
  if (status === "Open") return "blue";
  if (status === "In Progress") return "gold";
  if (status === "Resolved") return "green";
  if (status === "Closed") return "default";
  return "default";
};

const getPriorityColor = (priority = "") => {
  if (priority === "High") return "red";
  if (priority === "Medium") return "orange";
  if (priority === "Low") return "green";
  return "default";
};

const isComplaintOverdue = (complaint) => {
  const status = String(complaint?.status || "");
  if (status === "Resolved" || status === "Closed") {
    return false;
  }

  if (!complaint?.slaDeadline) {
    return false;
  }

  const deadline = new Date(complaint.slaDeadline);
  return !Number.isNaN(deadline.getTime()) && deadline < new Date();
};

const buildComplaintSummary = (complaint) => {
  const summary =
    complaint?.subject ||
    complaint?.description ||
    complaint?.message ||
    complaint?.details ||
    "";

  return String(summary || "").trim();
};

const formatComplaintDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString();
};

const ComplaintList = () => {
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFilter, setDateFilter] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, dateFilter, debouncedSearch, statusFilter]);

  const formattedDateFilter = dateFilter ? dateFilter.format("YYYY-MM-DD") : "";
  const {
    data: complaintPayload = null,
    isPending: isLoading,
    isFetching,
  } = useComplaintListQuery({
    page: currentPage,
    limit: PAGE_SIZE,
    status: statusFilter,
    category: categoryFilter,
    search: debouncedSearch,
    date: formattedDateFilter,
  });

  const visibleComplaints = useMemo(
    () => complaintPayload?.complaints || [],
    [complaintPayload?.complaints],
  );
  const pagination = complaintPayload?.pagination || {
    page: currentPage,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  };
  const totalPages = Math.max(pagination.totalPages || 0, 1);
  const safeCurrentPage = pagination.page || currentPage;
  const pageStart =
    pagination.total === 0 ? 0 : (safeCurrentPage - 1) * pagination.limit + 1;
  const pageEnd =
    pagination.total === 0
      ? 0
      : Math.min(safeCurrentPage * pagination.limit, pagination.total);

  useEffect(() => {
    if (!pagination?.hasNextPage) {
      return;
    }

    const nextPage = Number(pagination.page || currentPage) + 1;
    queryClient.prefetchQuery(
      getComplaintListQueryOptions({
        page: nextPage,
        limit: PAGE_SIZE,
        status: statusFilter,
        category: categoryFilter,
        search: debouncedSearch,
        date: formattedDateFilter,
      }),
    );
  }, [
    categoryFilter,
    currentPage,
    debouncedSearch,
    formattedDateFilter,
    pagination?.hasNextPage,
    pagination?.page,
    queryClient,
    statusFilter,
  ]);

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Complaint Management</h1>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-4">
          <Input
            allowClear
            placeholder="Search trainer or subject"
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <Select
            allowClear
            placeholder="Status"
            style={{ width: 150 }}
            value={statusFilter || undefined}
            onChange={(value) => setStatusFilter(value || "")}
          >
            <Option value="Open">Open</Option>
            <Option value="In Progress">In Progress</Option>
            <Option value="Resolved">Resolved</Option>
            <Option value="Closed">Closed</Option>
          </Select>
          <Select
            allowClear
            placeholder="Category"
            style={{ width: 180 }}
            value={categoryFilter || undefined}
            onChange={(value) => setCategoryFilter(value || "")}
          >
            <Option value="SPOC Issue">SPOC Issue</Option>
            <Option value="Schedule Issue">Schedule Issue</Option>
            <Option value="Payment Issue">Payment Issue</Option>
            <Option value="Technical Issue">Technical Issue</Option>
          </Select>
          <DatePicker
            placeholder="Select Date"
            value={dateFilter}
            onChange={(value) => setDateFilter(value || null)}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-sm text-slate-500 sm:px-6">
          <p>
            Showing {pageStart}-{pageEnd} of {pagination.total} complaints
          </p>
          {isFetching ? <span>Refreshing...</span> : null}
        </div>

        {isLoading && visibleComplaints.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            Loading complaints...
          </div>
        ) : visibleComplaints.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            No complaints match the selected filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleComplaints.map((complaint) => {
              const trainerName = complaint?.isAnonymous
                ? "Anonymous"
                : complaint?.trainerName || "Unknown trainer";
              const trainerEmail = complaint?.isAnonymous
                ? "Identity hidden"
                : complaint?.trainerId?.email || "No email";
              const summary = buildComplaintSummary(complaint);
              const overdue = isComplaintOverdue(complaint);

              return (
                <article
                  key={complaint._id}
                  className={`px-4 py-4 sm:px-6 ${
                    overdue ? "bg-red-50/50" : "bg-white"
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className={`truncate text-sm font-semibold ${
                            complaint?.isAnonymous ? "italic text-slate-600" : "text-slate-900"
                          }`}>
                            {trainerName}
                          </p>
                          <p className="truncate text-xs text-slate-500">{trainerEmail}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Tag color={complaint?.type === "Complaint" ? "red" : "blue"}>
                            {complaint?.type || "Feedback"}
                          </Tag>
                          <Tag color={getPriorityColor(complaint?.priority)}>
                            {complaint?.priority || "Normal"}
                          </Tag>
                          <Tag color={getStatusColor(complaint?.status)}>
                            {String(complaint?.status || "Open").toUpperCase()}
                          </Tag>
                          {overdue ? <Tag color="red">OVERDUE</Tag> : null}
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Category</p>
                          <p className="mt-1">{complaint?.category || "Uncategorized"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">College</p>
                          <p className="mt-1">{complaint?.collegeId?.name || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Created</p>
                          <p className="mt-1">{formatComplaintDate(complaint?.createdAt)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">SLA Deadline</p>
                          <p className="mt-1">{formatComplaintDate(complaint?.slaDeadline)}</p>
                        </div>
                      </div>

                      {summary ? (
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                          {summary}
                        </p>
                      ) : null}
                    </div>

                    <div className="shrink-0">
                      <Link href={`/dashboard/complaints/${complaint._id}`}>
                        <Button size="small" type="default">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {pagination.totalPages > 1 ? (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-sm text-slate-500">
              Page {safeCurrentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                disabled={!pagination.hasPrevPage}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                Previous
              </Button>
              <Button
                disabled={!pagination.hasNextPage}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ComplaintList;
