"use client";

import dynamic from "next/dynamic";
import {
  memo,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { List } from "react-window";
import ChartBarIcon from "@heroicons/react/24/outline/ChartBarIcon";
import MagnifyingGlassIcon from "@heroicons/react/24/outline/MagnifyingGlassIcon";
import UserCircleIcon from "@heroicons/react/24/outline/UserCircleIcon";
import Link from "next/link";

import {
  fetchTrainersPage,
  getTrainer,
} from "@/services/trainerService";
import { notify } from "@/lib/toast";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { QUERY_GC_TIMES, QUERY_STALE_TIMES } from "@/shared/config/queryPolicies";
import UserAvatar from "@/components/common/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

const DynamicTrainerModal = dynamic(() => import("@/components/modals/TrainerProfileModal"), {
  ssr: false,
});

const SPOC_TRAINERS_PAGE_SIZE = 25;
const SPOC_TRAINER_ROW_HEIGHT = 88;
const SPOC_TRAINER_TABLE_MAX_HEIGHT = 640;
const SPOC_TRAINER_GRID_TEMPLATE =
  "minmax(280px,1.4fr) 180px 200px 140px 150px";

const unwrapApiPayload = (response) => {
  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    typeof response.data !== "undefined" &&
    typeof response.success === "undefined"
  ) {
    return response.data;
  }
  return response;
};

const resolveTrainerDocId = (trainer) =>
  String(trainer?.id || trainer?._id || "").trim();

const resolveSpocTrainerRowId = (trainer = {}) => {
  const primaryId = resolveTrainerDocId(trainer);
  if (primaryId) {
    return primaryId;
  }

  return [
    trainer?.trainerId || "trainer-id",
    trainer?.userId?._id || trainer?.userId?.id || trainer?.userId?.email || "user",
    trainer?.userId?.name || trainer?.name || "name",
  ].join(":");
};

const isApprovedTrainer = (trainer) => {
  const verification = String(trainer?.verificationStatus || "")
    .trim()
    .toUpperCase();
  const isVerified = verification === "VERIFIED" || verification === "APPROVED";
  const isActive = trainer?.userId?.isActive !== false;
  return isVerified && isActive;
};

const buildTrainerSearchIndex = (trainer = {}) =>
  [
    trainer.userId?.name || trainer.name,
    trainer.userId?.email || trainer.email,
    trainer.trainerId,
    trainer.specialization,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const VirtualizedSpocTrainerRow = memo(function VirtualizedSpocTrainerRow({
  index,
  style,
  rows,
  onTrainerClick,
}) {
  const row = rows[index];
  const trainer = row.original;

  return (
    <div
      role="row"
      style={{
        ...style,
        display: "grid",
        gridTemplateColumns: SPOC_TRAINER_GRID_TEMPLATE,
        borderBottom: "1px solid #e2e8f0",
        background: "#fff",
      }}
      className="cursor-pointer transition-colors hover:bg-slate-50"
      onClick={() => onTrainerClick(trainer)}
    >
      {row.getVisibleCells().map((cell) => (
        <div
          key={cell.id}
          role="cell"
          style={{
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
          }}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </div>
      ))}
    </div>
  );
});

const CompanyTrainers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sorting, setSorting] = useState([{ id: "trainer", desc: false }]);
  const queryClient = useQueryClient();
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  const trainersQuery = useQuery({
    queryKey: ["spoc", "trainers", page, debouncedSearchTerm],
    staleTime: QUERY_STALE_TIMES.HIGH_CHURN_LIST,
    gcTime: QUERY_GC_TIMES.STANDARD,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
    queryFn: () =>
      fetchTrainersPage({
        page,
        limit: SPOC_TRAINERS_PAGE_SIZE,
        search: debouncedSearchTerm,
      }),
  });

  const listRows = useMemo(() => {
    const sourceRows = Array.isArray(trainersQuery.data?.data)
      ? trainersQuery.data.data
      : [];

    return sourceRows
      .filter(isApprovedTrainer)
      .sort((left, right) => {
        const leftName = String(left?.userId?.name || left?.name || "")
          .trim()
          .toLowerCase();
        const rightName = String(right?.userId?.name || right?.name || "")
          .trim()
          .toLowerCase();
        return leftName.localeCompare(rightName);
      });
  }, [trainersQuery.data?.data]);

  const handleTrainerClick = useCallback(
    async (trainer) => {
      try {
        const trainerId = resolveTrainerDocId(trainer);
        if (!trainerId) {
          notify.error("Trainer ID is missing for this record.");
          return;
        }

        const response = await queryClient.fetchQuery({
          queryKey: ["spoc", "trainer-details", trainerId],
          queryFn: () => getTrainer(trainerId),
          staleTime: 5 * 60_000,
        });
        const payload = unwrapApiPayload(response);
        const trainerData =
          payload?.data && !Array.isArray(payload.data) ? payload.data : payload;
        setSelectedTrainer(trainerData || null);
        setIsModalOpen(true);
      } catch (error) {
        console.error("Error fetching trainer details:", error);
        notify.error("Failed to load trainer details");
      }
    },
    [queryClient],
  );

  const columns = useMemo(
    () => [
      {
        id: "trainer",
        accessorFn: (row) => row.userId?.name || row.name || "",
        header: "Trainer",
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center">
            <div className="h-10 w-10 shrink-0">
              <UserAvatar
                profilePicture={row.original.profilePicture}
                name={row.original.userId?.name || row.original.name}
                className="h-10 w-10"
              />
            </div>
            <div className="ml-3 min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">
                {row.original.userId?.name || row.original.name || "N/A"}
              </div>
              <div className="truncate text-xs text-slate-500">
                {row.original.userId?.email || row.original.email || ""}
              </div>
            </div>
          </div>
        ),
      },
      {
        id: "trainerId",
        accessorFn: (row) => row.trainerId || "",
        header: "Trainer ID",
        cell: ({ row }) => (
          <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
            {row.original.trainerId || "Pending"}
          </span>
        ),
      },
      {
        id: "specialization",
        accessorFn: (row) => row.specialization || "",
        header: "Specialization",
        cell: ({ row }) => (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
            {row.original.specialization || "Not specified"}
          </span>
        ),
      },
      {
        id: "assign",
        accessorFn: (row) => resolveTrainerDocId(row),
        header: "Assign",
        enableSorting: false,
        cell: ({ row }) => {
          const trainerDocId = resolveTrainerDocId(row.original);
          return (
            <Link
              href={
                trainerDocId
                  ? `/spoc/trainers/${trainerDocId}/analytics?open=assign`
                  : "#"
              }
              onClick={(event) => event.stopPropagation()}
              className={`inline-flex items-center no-underline rounded-md px-2.5 py-1.5 text-xs font-semibold shadow-sm transition-colors ${
                trainerDocId
                  ? "bg-emerald-600 !text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  : "pointer-events-none bg-gray-200 text-gray-400"
              }`}
              title={trainerDocId ? "Assign Trainer Schedule" : "Trainer ID missing"}
            >
              Assign
            </Link>
          );
        },
      },
      {
        id: "manage",
        accessorFn: (row) => resolveTrainerDocId(row),
        header: "Manage",
        enableSorting: false,
        cell: ({ row }) => {
          const trainerDocId = resolveTrainerDocId(row.original);
          return (
            <Link
              href={trainerDocId ? `/spoc/trainers/${trainerDocId}/analytics` : "#"}
              onClick={(event) => event.stopPropagation()}
              className={`inline-flex items-center no-underline rounded-md px-2.5 py-1.5 text-xs font-semibold shadow-sm transition-colors ${
                trainerDocId
                  ? "bg-blue-600 !text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  : "pointer-events-none bg-gray-200 text-gray-400"
              }`}
              title={trainerDocId ? "Manage Trainer" : "Trainer ID missing"}
            >
              <ChartBarIcon className="mr-1 h-4 w-4" />
              Manage
            </Link>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: listRows,
    columns,
    getRowId: (row) => resolveSpocTrainerRowId(row),
    state: {
      sorting,
      globalFilter: String(debouncedSearchTerm || "").trim().toLowerCase(),
    },
    onSortingChange: setSorting,
    globalFilterFn: (row, _columnId, filterValue) =>
      buildTrainerSearchIndex(row.original).includes(String(filterValue || "").toLowerCase()),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const tableRows = table.getRowModel().rows;
  const virtualListHeight = Math.min(
    SPOC_TRAINER_TABLE_MAX_HEIGHT,
    Math.max(SPOC_TRAINER_ROW_HEIGHT, tableRows.length * SPOC_TRAINER_ROW_HEIGHT),
  );
  const pagination = trainersQuery.data || {
    page,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  };

  const handleTrainerUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["spoc", "trainers"] });
    if (selectedTrainer) {
      handleTrainerClick(selectedTrainer);
    }
  }, [handleTrainerClick, queryClient, selectedTrainer]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <DynamicTrainerModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        trainer={selectedTrainer}
        onUpdate={handleTrainerUpdate}
      />

      {trainersQuery.error ? (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800">
          <p className="text-sm">
            {trainersQuery.error.message || "Failed to load data"}
          </p>
        </div>
      ) : null}

      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Trainers
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            View trainer schedules, performance analytics, and manage documents.
          </p>
        </div>
      </div>

      <Card className="mt-5 rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700 ring-1 ring-emerald-200">
              Approved Only
            </span>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
              Total {pagination.total || 0}
            </span>
          </div>

            <div className="relative w-full max-w-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon
                className="h-5 w-5 text-slate-400"
                aria-hidden="true"
              />
            </div>
              <Input
              type="text"
              className="h-10 rounded-xl border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-200"
              placeholder="Search trainers by name, email, or trainer ID..."
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
            />
            </div>
          </div>
        </CardContent>
      </Card>

      {trainersQuery.isPending ? (
        <div className="mt-8 py-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
          <p className="mt-2 text-sm text-gray-500">Loading trainers...</p>
        </div>
      ) : (
        <div className="mt-7 flex flex-col">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {tableRows.length === 0 ? (
                  <div className="bg-white p-12 text-center">
                    <UserCircleIcon className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-2 text-sm font-semibold text-slate-900">
                      No trainers found
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      No approved trainers match your search.
                    </p>
                  </div>
                ) : (
                  <div style={{ minWidth: 980 }}>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <div
                        key={headerGroup.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: SPOC_TRAINER_GRID_TEMPLATE,
                          borderBottom: "1px solid #e2e8f0",
                          background: "#f8fafc",
                        }}
                      >
                        {headerGroup.headers.map((header) => (
                          <div
                            key={header.id}
                            role="columnheader"
                            className="px-3 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-600"
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                          </div>
                        ))}
                      </div>
                    ))}

                    <List
                      rowComponent={VirtualizedSpocTrainerRow}
                      rowCount={tableRows.length}
                      rowHeight={SPOC_TRAINER_ROW_HEIGHT}
                      rowProps={{
                        rows: tableRows,
                        onTrainerClick: handleTrainerClick,
                      }}
                      style={{ height: virtualListHeight, width: "100%" }}
                      overscanCount={4}
                    />
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Page {pagination.page || page} of {pagination.totalPages || 1}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasPrevPage}
                    onClick={() => setPage((previous) => Math.max(1, previous - 1))}
                    className="h-8 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Prev
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasNextPage}
                    onClick={() => setPage((previous) => previous + 1)}
                    className="h-8 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(CompanyTrainers);
