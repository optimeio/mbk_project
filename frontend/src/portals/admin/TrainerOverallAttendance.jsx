"use client";

import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Input,
  Tag,
  Space,
  Typography,
  Card,
  Breadcrumb,
  message,
  Button,
  DatePicker,
  Modal,
} from "antd";
import {
  Building2,
  CalendarDays,
  Clock3,
  FileSpreadsheet,
  FileText,
  Search,
  UserRound,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { List } from "react-window";
import Link from "next/link";
import { getSecureImageUrl } from "@/utils/imageUtils";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { QUERY_GC_TIMES, QUERY_STALE_TIMES } from "@/shared/config/queryPolicies";
import { mapInBatches, runOnIdle } from "@/shared/lib/mainThread";
import {
  getTrainerOverallAttendanceQueryOptions,
  listTrainerActivity,
  useTrainerOverallAttendanceQuery,
} from "@/modules/attendance";

import dayjs from "dayjs";

const getXlsx = async () => import("xlsx");

const getPdfTools = async () => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  return { jsPDF, autoTable };
};

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const ATTENDANCE_PAGE_SIZE = 25;
const ATTENDANCE_EXPORT_PAGE_SIZE = 100;
const MAX_ATTENDANCE_EXPORT_PAGES = 30;
const ATTENDANCE_ROW_HEIGHT = 96;
const ATTENDANCE_TABLE_HEIGHT = 620;
// Keep this aligned with ATTENDANCE_GRID_TEMPLATE minimum track sizes:
// 160 + 220 + 200 + 180 + 180 + 260 + 150 + 120 = 1470
const ATTENDANCE_TABLE_MIN_WIDTH = 1470;
const ATTENDANCE_GRID_TEMPLATE =
  "160px minmax(220px,1.1fr) minmax(200px,1fr) 180px 180px minmax(260px,1.2fr) 150px 120px";

const SORT_ICONS = {
  asc: " \u2191",
  desc: " \u2193",
};

const normalizeGeoStatus = (recordOrStatus) => {
    if (recordOrStatus && typeof recordOrStatus === 'object') {
        const checkOutToken = String(recordOrStatus.checkOutVerificationStatus || '')
            .trim()
            .toLowerCase()
            .replace(/[\s-]+/g, '_');
        if (checkOutToken) {
            return checkOutToken;
        }
        return String(recordOrStatus.geoVerificationStatus || '').trim().toLowerCase();
    }
    return String(recordOrStatus || '').trim().toLowerCase();
};

const getGeoStatusMeta = (recordOrStatus) => {
    const normalized = normalizeGeoStatus(recordOrStatus);
    if (normalized === "auto_verified" || normalized === "approved" || normalized === "completed") {
        return { label: "Auto Verified", color: "green" };
    }
    if (normalized === "verified") {
        return { label: "Verified", color: "green" };
    }
    if (normalized === "manual_review_required") {
        return { label: "Manual Review", color: "blue" };
    }
    if (normalized === 'rejected' || normalized === 'failed') {
        return { label: 'Rejected', color: 'red' };
    }
    if (normalized === 'pending_checkout' || normalized === 'pending') {
        return { label: 'Pending', color: 'gold' };
    }
    return { label: 'Not Submitted', color: 'default' };
};

const toFiniteNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const getCheckOutEvidenceEntries = (record = {}) => {
    if (Array.isArray(record?.checkOut?.photos) && record.checkOut.photos.length) {
        return record.checkOut.photos
            .map((photo, index) => {
                const sourceUrl = photo?.url || null;
                const previewUrl = getSecureImageUrl(sourceUrl);
                return sourceUrl && previewUrl ? {
                    key: `photo-${index}`,
                    url: sourceUrl,
                    previewUrl,
                    validationStatus: photo?.validationStatus || null,
                    validationReason: photo?.validationReason || null,
                    latitude: toFiniteNumber(photo?.latitude),
                    longitude: toFiniteNumber(photo?.longitude),
                    distanceKm: photo?.distanceKm ?? null,
                    capturedAt: photo?.capturedAt || null,
                } : null;
            })
            .filter(Boolean);
    }

    if (Array.isArray(record?.checkOutGeoImageUrls) && record.checkOutGeoImageUrls.length) {
        return record.checkOutGeoImageUrls
            .map((item, index) => {
                const previewUrl = getSecureImageUrl(item);
                return item && previewUrl ? {
                    key: `legacy-${index}`,
                    url: item,
                    previewUrl,
                    validationStatus: null,
                    validationReason: null,
                    latitude: null,
                    longitude: null,
                    distanceKm: null,
                    capturedAt: null,
                } : null;
            })
            .filter(Boolean);
    }

    if (record?.checkOutGeoImageUrl) {
        const previewUrl = getSecureImageUrl(record.checkOutGeoImageUrl);
        return previewUrl
            ? [{
                key: 'legacy-single',
                url: record.checkOutGeoImageUrl,
                previewUrl,
                validationStatus: null,
                validationReason: null,
                latitude: null,
                longitude: null,
                distanceKm: null,
                capturedAt: null,
            }]
            : [];
    }

    return [];
};

const getPreferredCheckOutLocation = (record = {}) => {
    const photos = Array.isArray(record?.checkOut?.photos) ? record.checkOut.photos : [];
    const preferredPhoto =
        photos.find((photo) =>
            String(photo?.validationStatus || '').trim().toLowerCase() === 'verified' &&
            Number.isFinite(toFiniteNumber(photo?.latitude)) &&
            Number.isFinite(toFiniteNumber(photo?.longitude))
        ) ||
        photos.find((photo) =>
            Number.isFinite(toFiniteNumber(photo?.latitude)) &&
            Number.isFinite(toFiniteNumber(photo?.longitude))
        ) ||
        null;

    if (preferredPhoto) {
        const distanceKm = toFiniteNumber(preferredPhoto?.distanceKm);
        return {
            lat: toFiniteNumber(preferredPhoto?.latitude),
            lng: toFiniteNumber(preferredPhoto?.longitude),
            distanceFromCollege: Number.isFinite(distanceKm) ? distanceKm * 1000 : null,
            source: 'geo-tag-image',
        };
    }

    const fallbackLocation = record?.checkOut?.location || null;
    return {
        lat: toFiniteNumber(fallbackLocation?.lat),
        lng: toFiniteNumber(fallbackLocation?.lng),
        distanceFromCollege: toFiniteNumber(fallbackLocation?.distanceFromCollege),
        source: 'live-location',
    };
};

const buildAttendanceSearchIndex = (row = {}) =>
  [
    row?.trainerId?.userId?.name,
    row?.trainerId?.trainerId,
    row?.collegeId?.name,
    row?.status,
    row?.checkInTime,
    row?.checkOutTime,
    row?.dayNumber,
    row?.scheduleId?.dayNumber,
    row?.geoVerificationStatus,
    row?.checkOutVerificationStatus,
    row?.geoValidationComment,
    row?.checkOutVerificationReason,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const resolveAttendanceRowId = (row = {}) => {
  const primaryId = row?._id || row?.id || row?.attendanceId;
  if (primaryId) {
    return String(primaryId);
  }

  return [
    row?.trainerId?._id || row?.trainerId?.id || row?.trainerId?.trainerId || "trainer",
    row?.date || "date",
    row?.dayNumber ?? row?.scheduleId?.dayNumber ?? "day",
    row?.checkInTime || "checkin",
  ].join(":");
};

const VirtualizedAttendanceRow = memo(function VirtualizedAttendanceRow({
  index,
  style,
  rows,
}) {
  const row = rows[index];
  if (!row) {
    return null;
  }

  return (
    <div
      role="row"
      style={{
        ...style,
        display: "grid",
        gridTemplateColumns: ATTENDANCE_GRID_TEMPLATE,
        borderBottom: "1px solid #f5f5f5",
        alignItems: "stretch",
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <div
          key={cell.id}
          role="cell"
          style={{
            padding: "12px",
            verticalAlign: "top",
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

const TrainerOverallAttendance = () => {
    const queryClient = useQueryClient();
    const [searchText, setSearchText] = useState("");
    const [dateRange, setDateRange] = useState(null);
    const [selectedGeoRecord, setSelectedGeoRecord] = useState(null);
    const [page, setPage] = useState(1);
    const [exporting, setExporting] = useState(false);
    const [sorting, setSorting] = useState([{ id: "date", desc: true }]);
    const debouncedSearchText = useDebouncedValue(searchText, 300);

    const normalizedDateRange = useMemo(
      () => ({
        startDate: dateRange?.[0]
          ? dayjs(dateRange[0]).format("YYYY-MM-DD")
          : null,
        endDate: dateRange?.[1] ? dayjs(dateRange[1]).format("YYYY-MM-DD") : null,
      }),
      [dateRange],
    );

    const attendanceFilters = useMemo(
      () => ({
        searchText: String(debouncedSearchText || "").trim(),
        startDate: normalizedDateRange.startDate || "",
        endDate: normalizedDateRange.endDate || "",
      }),
      [debouncedSearchText, normalizedDateRange.endDate, normalizedDateRange.startDate],
    );

    const attendanceQuery = useTrainerOverallAttendanceQuery({
      page,
      limit: ATTENDANCE_PAGE_SIZE,
      searchText: attendanceFilters.searchText,
      startDate: attendanceFilters.startDate,
      endDate: attendanceFilters.endDate,
    });

    useEffect(() => {
      if (!attendanceQuery.error) {
        return;
      }

      console.error("Error fetching attendance:", attendanceQuery.error);
      message.error(attendanceQuery.error.message || "Error loading attendance data");
    }, [attendanceQuery.error]);

    const data = attendanceQuery.data?.rows || [];
    const pagination = attendanceQuery.data?.pagination || {
      page,
      limit: ATTENDANCE_PAGE_SIZE,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    };
    const loading = attendanceQuery.isPending;
    const isRefreshing = attendanceQuery.isFetching && !attendanceQuery.isPending;
    const tableData = useMemo(
      () =>
        data.map((row) => ({
          ...row,
          __searchIndex: buildAttendanceSearchIndex(row),
        })),
      [data],
    );

    useEffect(() => {
      if (!pagination?.hasNextPage) {
        return;
      }

      const nextPage = Number(pagination.page || page) + 1;
      queryClient.prefetchQuery(
        getTrainerOverallAttendanceQueryOptions({
          page: nextPage,
          limit: ATTENDANCE_PAGE_SIZE,
          searchText: attendanceFilters.searchText,
          startDate: attendanceFilters.startDate,
          endDate: attendanceFilters.endDate,
        }),
      );
    }, [
      attendanceFilters.endDate,
      attendanceFilters.searchText,
      attendanceFilters.startDate,
      page,
      pagination?.hasNextPage,
      pagination?.page,
      queryClient,
    ]);

    const fetchExportRows = useCallback(async () => {
      return queryClient.fetchQuery({
        queryKey: [
          "trainer-overall-attendance-export",
          {
            searchText: String(attendanceFilters.searchText || "").toLowerCase(),
            startDate: attendanceFilters.startDate,
            endDate: attendanceFilters.endDate,
          },
        ],
        staleTime: QUERY_STALE_TIMES.DETAIL,
        gcTime: QUERY_GC_TIMES.SHORT,
        queryFn: async () => {
          const aggregatedRows = [];
          let currentPage = 1;
          let hasNextPage = true;

          while (hasNextPage && currentPage <= MAX_ATTENDANCE_EXPORT_PAGES) {
            const pagePayload = await listTrainerActivity({
              page: currentPage,
              limit: ATTENDANCE_EXPORT_PAGE_SIZE,
              searchText: attendanceFilters.searchText,
              startDate: attendanceFilters.startDate,
              endDate: attendanceFilters.endDate,
            });
            aggregatedRows.push(...(pagePayload?.rows || []));
            hasNextPage = Boolean(pagePayload?.pagination?.hasNextPage);
            currentPage += 1;
          }

          return aggregatedRows;
        },
      });
    }, [
      attendanceFilters.endDate,
      attendanceFilters.searchText,
      attendanceFilters.startDate,
      queryClient,
    ]);

    const handleExportExcel = async () => {
      try {
        setExporting(true);
        const exportRows = await fetchExportRows();
        const XLSX = await getXlsx();
        const exportData = await mapInBatches(
          exportRows,
          (item) => ({
            Date: item.date ? dayjs(item.date).format("DD MMM YYYY") : "-",
            "Trainer Name": item.trainerId?.userId?.name || "Unknown",
            "Trainer ID": item.trainerId?.trainerId || "-",
            "College Name": item.collegeId?.name || "-",
            "Check-In": item.checkInTime || "-",
            "Check-Out": item.checkOutTime || "-",
            Status: item.status || "-",
            "Assigned Day": item.dayNumber || item.scheduleId?.dayNumber || "-",
            "Geo Verification": getGeoStatusMeta(item).label,
          }),
          { batchSize: 300 },
        );

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
        await new Promise((resolve) => {
          runOnIdle(() => {
            XLSX.writeFile(
              wb,
              `Trainer_Overall_Attendance_${dayjs().format("YYYY-MM-DD")}.xlsx`,
            );
            resolve();
          }, 1500);
        });
        message.success("Excel exported successfully");
      } catch (error) {
        console.error("Excel Export Error:", error);
        message.error("Failed to export Excel");
      } finally {
        setExporting(false);
      }
    };

    const handleExportPDF = async () => {
      try {
        setExporting(true);
        const exportRows = await fetchExportRows();
        const { jsPDF, autoTable } = await getPdfTools();
        const doc = new jsPDF("l", "mm", "a4");
        const tableColumn = [
          "Date",
          "Trainer",
          "College",
          "Check-In",
          "Check-Out",
          "Status",
          "Geo",
          "Day",
        ];
        const tableRows = await mapInBatches(
          exportRows,
          (item) => [
            item.date ? dayjs(item.date).format("DD MMM YYYY") : "-",
            item.trainerId?.userId?.name || "Unknown",
            item.collegeId?.name || "-",
            item.checkInTime || "-",
            item.checkOutTime || "-",
            item.status || "-",
            getGeoStatusMeta(item).label,
            item.dayNumber || item.scheduleId?.dayNumber || "-",
          ],
          { batchSize: 300 },
        );

        doc.text("Trainer Overall Attendance Report", 14, 15);
        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 20,
          theme: "striped",
          headStyles: { fillColor: [24, 144, 255] },
        });

        await new Promise((resolve) => {
          runOnIdle(() => {
            doc.save(`Trainer_Overall_Attendance_${dayjs().format("YYYY-MM-DD")}.pdf`);
            resolve();
          }, 1500);
        });
        message.success("PDF exported successfully");
      } catch (error) {
        console.error("PDF Export Error:", error);
        message.error("Failed to export PDF");
      } finally {
        setExporting(false);
      }
    };

    const handleDateRangeChange = useCallback((values) => {
        setDateRange(values);
        setPage(1);
    }, []);

    const handleSearchChange = useCallback((event) => {
        setSearchText(event.target.value);
        setPage(1);
    }, []);

    const columns = useMemo(
      () => [
        {
          id: "date",
          accessorFn: (row) => (row.date ? dayjs(row.date).valueOf() : 0),
          header: "Date",
          cell: ({ row }) => (
            <Space>
              <CalendarDays size={14} color="#8c8c8c" />
              <Text>{row.original.date ? dayjs(row.original.date).format("DD MMM YYYY") : "-"}</Text>
            </Space>
          ),
        },
        {
          id: "trainer",
          accessorFn: (row) => row.trainerId?.userId?.name || "Unknown",
          header: "Trainer Name",
          cell: ({ row }) => (
            <Space orientation="vertical" size={0}>
              <Space>
                <UserRound size={14} color="#1890ff" />
                <Text strong>{row.original.trainerId?.userId?.name || "Unknown"}</Text>
              </Space>
              <Text type="secondary" style={{ fontSize: "12px" }}>
                ID: {row.original.trainerId?.trainerId || "-"}
              </Text>
            </Space>
          ),
        },
        {
          id: "college",
          accessorFn: (row) => row.collegeId?.name || "",
          header: "College",
          cell: ({ row }) => (
            <Space>
              <Building2 size={14} color="#722ed1" />
              <Text>{row.original.collegeId?.name || "-"}</Text>
            </Space>
          ),
        },
        {
          id: "checkIn",
          accessorFn: (row) => row.checkInTime || "",
          header: "Check-In",
          cell: ({ row }) => (
            <Tag color="cyan" icon={<Clock3 size={12} />}>
              {row.original.checkInTime || "-"}
            </Tag>
          ),
        },
        {
          id: "checkOut",
          accessorFn: (row) => row.checkOutTime || "",
          header: "Check-Out",
          cell: ({ row }) => (
            <Tag color="blue" icon={<Clock3 size={12} />}>
              {row.original.checkOutTime || "-"}
            </Tag>
          ),
        },
        {
          id: "geoEvidence",
          accessorFn: (row) => getGeoStatusMeta(row).label,
          header: "Check-Out Evidence",
          cell: ({ row }) => {
            const record = row.original;
            const evidenceEntries = getCheckOutEvidenceEntries(record);
            const geoStatus = getGeoStatusMeta(record);

            return (
              <Space orientation="vertical" size={6}>
                <Tag color={geoStatus.color}>{geoStatus.label}</Tag>
                {record.geoValidationComment ? (
                  <Text
                    type="danger"
                    style={{ maxWidth: 220, fontSize: "12px" }}
                    ellipsis={{ tooltip: record.geoValidationComment }}
                  >
                    {record.geoValidationComment}
                  </Text>
                ) : (
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    {evidenceEntries.length > 0
                      ? `${evidenceEntries.length} geo image(s) saved`
                      : "No geo images"}
                  </Text>
                )}
                {evidenceEntries.length > 0 ? (
                  <Button size="small" onClick={() => setSelectedGeoRecord(record)}>
                    View Check-Out
                  </Button>
                ) : null}
              </Space>
            );
          },
        },
        {
          id: "status",
          accessorFn: (row) => row.status || "",
          header: "Present / Absent",
          cell: ({ row }) => {
            const status = row.original.status;
            let color = "gold";
            if (status === "Present") color = "green";
            if (status === "Absent") color = "red";
            return (
              <Tag color={color} style={{ minWidth: "70px", textAlign: "center" }}>
                {status || "-"}
              </Tag>
            );
          },
        },
        {
          id: "assignedDays",
          accessorFn: (row) => row.dayNumber || row.scheduleId?.dayNumber || 0,
          header: "Assigned Day",
          cell: ({ row }) => (
            <Tag color="purple">
              Day {row.original.dayNumber || row.original.scheduleId?.dayNumber || "-"}
            </Tag>
          ),
        },
      ],
      [],
    );

    const table = useReactTable({
      data: tableData,
      columns,
      getRowId: (row) => resolveAttendanceRowId(row),
      state: {
        sorting,
        globalFilter: String(attendanceFilters.searchText || "").trim().toLowerCase(),
      },
      onSortingChange: setSorting,
      getCoreRowModel: getCoreRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      getSortedRowModel: getSortedRowModel(),
      globalFilterFn: (row, _columnId, filterValue) => {
        if (!filterValue) return true;
        return String(row.original.__searchIndex || "").includes(String(filterValue).toLowerCase());
      },
    });
    const tableRows = table.getRowModel().rows;
    const virtualListRowProps = useMemo(() => ({ rows: tableRows }), [tableRows]);
    const virtualListHeight = Math.min(
      ATTENDANCE_TABLE_HEIGHT,
      Math.max(ATTENDANCE_ROW_HEIGHT, tableRows.length * ATTENDANCE_ROW_HEIGHT),
    );
    const canGoPrevious = pagination.page > 1;
    const canGoNext = pagination.page < Math.max(1, pagination.totalPages);

    return (
      <div style={{ padding: "24px" }}>
        <Breadcrumb
          style={{ marginBottom: "16px" }}
          items={[
            { title: <Link href="/dashboard">Home</Link> },
            { title: "Overall Attendance" },
          ]}
        />

        <Card>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "24px",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <Title level={2} style={{ margin: 0 }}>
                Overall Attendance
              </Title>
              <Text type="secondary" style={{ fontSize: "18px", fontWeight: 500 }}>
                Report
              </Text>
              {isRefreshing ? (
                <div>
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    Refreshing attendance data...
                  </Text>
                </div>
              ) : null}
            </div>
            <Space size="middle" style={{ flexWrap: "wrap" }}>
              <Button
                type="primary"
                icon={<FileSpreadsheet size={14} />}
                onClick={handleExportExcel}
                disabled={loading || exporting || pagination.total === 0}
                loading={exporting}
                style={{ backgroundColor: "#1d7044", borderColor: "#1d7044" }}
              >
                Export Excel
              </Button>
              <Button
                type="primary"
                danger
                icon={<FileText size={14} />}
                onClick={handleExportPDF}
                disabled={loading || exporting || pagination.total === 0}
                loading={exporting}
              >
                Export PDF
              </Button>
              <RangePicker
                onChange={handleDateRangeChange}
                style={{ width: 280 }}
                placeholder={["Start Date", "End Date"]}
              />
              <Input
                placeholder="Search trainer or college..."
                prefix={<Search size={14} />}
                style={{ width: 300 }}
                value={searchText}
                onChange={handleSearchChange}
                allowClear
              />
            </Space>
          </div>

          <div style={{ overflowX: "auto", overflowY: "hidden" }}>
            <div style={{ minWidth: ATTENDANCE_TABLE_MIN_WIDTH }}>
              {table.getHeaderGroups().map((headerGroup) => (
                <div
                  key={headerGroup.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: ATTENDANCE_GRID_TEMPLATE,
                    borderBottom: "1px solid #f0f0f0",
                    background: "#fafafa",
                  }}
                >
                  {headerGroup.headers.map((header) => {
                    const isSorted = header.column.getIsSorted();
                    const sortHint =
                      isSorted === "asc"
                        ? SORT_ICONS.asc
                        : isSorted === "desc"
                          ? SORT_ICONS.desc
                          : "";

                    return (
                      <div
                        key={header.id}
                        role="columnheader"
                        style={{
                          textAlign: "left",
                          padding: "12px",
                          fontWeight: 700,
                          fontSize: 12,
                          letterSpacing: "0.03em",
                          textTransform: "uppercase",
                          color: "#475569",
                          cursor: header.column.getCanSort() ? "pointer" : "default",
                        }}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sortHint}
                      </div>
                    );
                  })}
                </div>
              ))}

              {loading && data.length === 0 ? (
                <div style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>
                  Loading attendance records...
                </div>
              ) : null}

              {!loading && tableRows.length === 0 ? (
                <div style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>
                  No attendance records found for the selected filters.
                </div>
              ) : null}

              {!loading && tableRows.length > 0 ? (
                <List
                  rowComponent={VirtualizedAttendanceRow}
                  rowCount={tableRows.length}
                  rowHeight={ATTENDANCE_ROW_HEIGHT}
                  rowProps={virtualListRowProps}
                  style={{ height: virtualListHeight, width: "100%", overflowX: "hidden" }}
                  overscanCount={4}
                />
              ) : null}
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Text type="secondary" style={{ fontSize: 12 }}>
              Showing page {pagination.page} of {Math.max(1, pagination.totalPages)} (
              {pagination.total} total)
            </Text>
            <Space>
              <Button disabled={!canGoPrevious} onClick={() => setPage((previous) => previous - 1)}>
                Prev
              </Button>
              <Button disabled={!canGoNext} onClick={() => setPage((previous) => previous + 1)}>
                Next
              </Button>
            </Space>
          </div>
        </Card>

            <Modal
                open={Boolean(selectedGeoRecord)}
                title="Check-Out Geo Evidence"
                onCancel={() => setSelectedGeoRecord(null)}
                footer={[
                    <Button key="close" onClick={() => setSelectedGeoRecord(null)}>
                        Close
                    </Button>,
                ]}
                width={920}
            >
                {selectedGeoRecord ? (() => {
                    const evidenceEntries = getCheckOutEvidenceEntries(selectedGeoRecord);
                    const geoStatus = getGeoStatusMeta(selectedGeoRecord);
                    const location = getPreferredCheckOutLocation(selectedGeoRecord);
                    const mapsUrl =
                        Number.isFinite(location?.lat) && Number.isFinite(location?.lng)
                            ? `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`
                            : null;

                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <Card size="small">
                                <Space orientation="vertical" size={6}>
                                    <Text strong>{selectedGeoRecord.trainerId?.userId?.name || 'Unknown Trainer'}</Text>
                                    <Text type="secondary">
                                        {selectedGeoRecord.collegeId?.name || '-'} / {selectedGeoRecord.date ? dayjs(selectedGeoRecord.date).format('DD MMM YYYY') : '-'}
                                    </Text>
                                    <Space wrap>
                                        <Tag color={geoStatus.color}>{geoStatus.label}</Tag>
                                        <Tag color="blue">Check-Out {selectedGeoRecord.checkOutTime || '-'}</Tag>
                                        <Tag color={selectedGeoRecord.driveSyncStatus === 'FAILED' ? 'red' : selectedGeoRecord.driveSyncStatus === 'SYNCED' ? 'green' : 'gold'}>
                                            {selectedGeoRecord.driveSyncStatus || 'PENDING'}
                                        </Tag>
                                    </Space>
                                    {(selectedGeoRecord.checkOutVerificationReason || selectedGeoRecord.geoValidationComment) ? (
                                        <Text type="danger">
                                            {selectedGeoRecord.checkOutVerificationReason || selectedGeoRecord.geoValidationComment}
                                        </Text>
                                    ) : null}
                                    {location ? (
                                        <Text type="secondary">
                                            Location: {location.lat || 'N/A'}, {location.lng || 'N/A'}
                                            {typeof location.distanceFromCollege === 'number'
                                                ? ` / ${Math.round(location.distanceFromCollege)} m from college`
                                                : ''}
                                            {location?.source === 'geo-tag-image' ? ' / Geo-tag image' : ''}
                                        </Text>
                                    ) : null}
                                    {mapsUrl ? (
                                        <Button size="small" type="link" href={mapsUrl} target="_blank">
                                            Open Map
                                        </Button>
                                    ) : null}
                                </Space>
                            </Card>

                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                    gap: 16,
                                }}
                            >
                                {evidenceEntries.map((entry, index) => (
                                    <Card key={entry.key} size="small" styles={{ body: { padding: 12 } }}>
                                        <div
                                            style={{
                                                aspectRatio: '4 / 3',
                                                overflow: 'hidden',
                                                borderRadius: 12,
                                                border: '1px solid #f0f0f0',
                                                background: '#f8fafc',
                                            }}
                                        >
                                            <img loading="lazy"
                                                src={entry.previewUrl}
                                                alt={`Check-out evidence ${index + 1}`}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        </div>
                                        <Space orientation="vertical" size={6} style={{ marginTop: 12, width: '100%' }}>
                                            <Space wrap>
                                                <Tag color={entry.validationStatus === 'verified' ? 'green' : 'gold'}>
                                                    {entry.validationStatus === 'verified' ? 'Verified' : 'Saved'}
                                                </Tag>
                                                {typeof entry.distanceKm === 'number' ? (
                                                    <Tag>{entry.distanceKm.toFixed(2)} km</Tag>
                                                ) : null}
                                            </Space>
                                            {entry.validationReason ? (
                                                <Text type="danger" style={{ fontSize: '12px' }}>
                                                    {entry.validationReason}
                                                </Text>
                                            ) : (
                                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                                    {entry.capturedAt ? `Captured ${dayjs(entry.capturedAt).format('DD MMM YYYY hh:mm A')}` : 'Saved with attendance record'}
                                                </Text>
                                            )}
                                            <Button size="small" type="link" href={entry.previewUrl} target="_blank" style={{ paddingLeft: 0 }}>
                                                Open Image
                                            </Button>
                                        </Space>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    );
                })() : null}
            </Modal>
        </div>
    );
};

export default TrainerOverallAttendance;
