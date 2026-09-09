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
  Tabs,
  Tooltip,
  Image,
  Table,
  Empty,
  Badge,
  Dropdown,
  Spin,
} from "antd";
import {
  Building2,
  CalendarDays,
  Clock3,
  Clock,
  FileSpreadsheet,
  FileText,
  Search,
  UserRound,
  MapPin,
  CheckCircle2,
  XCircle,
  ExternalLink,
  BookOpen,
  Users,
  Image as ImageIcon,
  Pencil,
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
import { getSecureImageUrl, isValidGoogleDriveId } from "@/utils/imageUtils";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { QUERY_GC_TIMES, QUERY_STALE_TIMES } from "@/shared/config/queryPolicies";
import { mapInBatches, runOnIdle } from "@/shared/lib/mainThread";
import {
  getTrainerOverallAttendanceQueryOptions,
  listTrainerActivity,
  useTrainerOverallAttendanceQuery,
} from "@/modules/attendance";

import { api } from "@/services/api";
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
const ATTENDANCE_ROW_HEIGHT = 80;
const ATTENDANCE_TABLE_HEIGHT = 650;
const ATTENDANCE_TABLE_MIN_WIDTH = 1630;
const ATTENDANCE_GRID_TEMPLATE =
  "120px 90px 90px 170px 220px 150px 110px 95px 150px 135px 135px 155px";

const SORT_ICONS = {
  asc: " \u2191",
  desc: " \u2193",
};

const formatTimeLabel = (timeValue) => {
  if (!timeValue) return "-";
  const str = String(timeValue).trim();
  if (!str || str === "-") return "-";
  if (str.includes("T") || str.includes("-")) {
    const parsed = dayjs(str);
    if (parsed.isValid()) return parsed.format("hh:mm A");
  }
  if (/^\d{1,2}:\d{2}/.test(str)) {
    const [h, m] = str.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;
    return `${String(formattedHour).padStart(2, '0')}:${m} ${ampm}`;
  }
  return str;
};

const normalizeUrlKey = (url) => {
  if (!url) return '';
  let str = String(url).trim().toLowerCase();
  str = str.split('?')[0];

  // Match Google Drive file ID
  const driveMatch = str.match(/\/d\/([a-z0-9_-]{15,100})/i) || str.match(/[?&]id=([a-z0-9_-]{15,100})/i);
  if (driveMatch?.[1]) {
    return `drive-${driveMatch[1]}`;
  }

  const parts = str.split('/');
  return parts[parts.length - 1] || str;
};

const deduplicateByUrl = (items = [], getUrlFn = (item) => item?.driveFileId ? `drive-${item.driveFileId}` : (item?.previewUrl || item?.url || item?.originalUrl)) => {
  const seen = new Set();
  return items.filter((item) => {
    const rawUrl = getUrlFn(item);
    const key = normalizeUrlKey(rawUrl);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getPreferredCheckInLocation = (record = {}) => {
  const loc = record?.checkInLocation || record?.checkIn?.location || null;
  const lat = toFiniteNumber(loc?.lat ?? loc?.latitude ?? record?.latitude);
  const lng = toFiniteNumber(loc?.lng ?? loc?.longitude ?? record?.longitude);
  const distanceFromCollege = toFiniteNumber(loc?.distanceFromCollege ?? record?.distanceFromCollege);
  const address = loc?.address || null;

  return {
    lat,
    lng,
    distanceFromCollege,
    address,
    hasCoords: Number.isFinite(lat) && Number.isFinite(lng)
  };
};

const getCheckInEntries = (record = {}) => {
  const entries = [];
  const rawImageUrl = record?.imageUrl || null;
  const isCheckInImageUrl =
    rawImageUrl &&
    (String(rawImageUrl).toLowerCase().includes('check_in') ||
     String(rawImageUrl).toLowerCase().includes('clock_in') ||
     (!record?.attendancePhoto && !record?.attendancePhotoUrl && !record?.attendanceDocumentUrl && !record?.attendancePdfUrl && !record?.attendanceExcelUrl && !record?.attendanceFile));

  const photoUrl =
    record?.checkInPhoto ||
    record?.checkIn?.photo ||
    record?.checkIn?.photoUrl ||
    record?.checkIn?.imageUrl ||
    record?.checkInGeoImageUrl ||
    record?.check_in_image ||
    record?.clock_in_image ||
    record?.clockInImage ||
    record?.clockInPhoto ||
    record?.checkInImage ||
    (isCheckInImageUrl ? rawImageUrl : null);

  const sigUrl = record?.signatureUrl || record?.signature || record?.checkIn?.signatureUrl;

  // Check attached documents specifically for check-in geotags & signatures
  const docs = Array.isArray(record?.documents) ? record.documents : (Array.isArray(record?.scheduleDocuments) ? record.scheduleDocuments : []);
  
  const checkInDocs = docs.filter((doc) => {
    return (
      doc?.fileField === 'checkInPhoto' ||
      doc?.fileField === 'check_in_image' ||
      doc?.fileField === 'clock_in_image' ||
      (doc?.fileType === 'geotag' && !String(doc?.fileName || '').toLowerCase().includes('checkout') && !String(doc?.fileField || '').toLowerCase().includes('checkout'))
    );
  });

  const sigDocs = docs.filter((doc) => doc?.fileField === 'signature');

  // If we have attached check-in document(s) from Drive, use those as the authentic files
  if (checkInDocs.length > 0) {
    checkInDocs.forEach((doc) => {
      const docUrl = doc?.fileUrl || (isValidGoogleDriveId(doc?.driveFileId) ? `https://lh3.googleusercontent.com/d/${doc.driveFileId}=w1200` : null);
      if (docUrl) {
        entries.push({
          key: `doc-checkin-${doc._id || doc.driveFileId}`,
          url: docUrl,
          previewUrl: getSecureImageUrl(docUrl),
          driveFileId: doc.driveFileId,
          label: doc.fileName || 'Check-In Geotag Photo'
        });
      }
    });
  } else if (photoUrl) {
    // Only add generic check-in photo if no check-in document exists
    entries.push({
      key: 'checkin-photo',
      url: photoUrl,
      previewUrl: getSecureImageUrl(photoUrl),
      driveFileId: record?.checkIn?.driveFileId || record?.driveFileId,
      label: 'Check-In Geotag Selfie'
    });
  }

  // Handle signature: prefer signature document if available
  if (sigDocs.length > 0) {
    sigDocs.forEach((doc) => {
      const docUrl = doc?.fileUrl || (isValidGoogleDriveId(doc?.driveFileId) ? `https://lh3.googleusercontent.com/d/${doc.driveFileId}=w1200` : null);
      if (docUrl) {
        entries.push({
          key: `doc-sig-${doc._id || doc.driveFileId}`,
          url: docUrl,
          previewUrl: getSecureImageUrl(docUrl),
          driveFileId: doc.driveFileId,
          label: doc.fileName || 'Trainer Signature'
        });
      }
    });
  } else if (sigUrl) {
    entries.push({
      key: 'signature',
      url: sigUrl,
      previewUrl: getSecureImageUrl(sigUrl),
      label: 'Trainer Signature'
    });
  }

  return deduplicateByUrl(entries);
};

const getAttendanceFileEntries = (record = {}) => {
  const files = [];
  const pdfUrl = record?.attendancePdfUrl || record?.studentAttendancePdfUrl || record?.scannedAttendancePdfUrl || record?.attendancePdf || record?.attendance_pdf;
  if (pdfUrl) {
    files.push({
      type: 'pdf',
      name: 'Attendance PDF Document',
      url: getSecureImageUrl(pdfUrl),
      originalUrl: pdfUrl,
    });
  }
  const excelUrl = record?.attendanceExcelUrl || record?.studentAttendanceExcelUrl || record?.attendanceSheetUrl || record?.attendanceExcel || record?.attendance_excel;
  if (excelUrl) {
    files.push({
      type: 'excel',
      name: 'Attendance Excel Sheet',
      url: getSecureImageUrl(excelUrl),
      originalUrl: excelUrl,
    });
  }

  // Check for image-based attendance sheets, certificates, or uploaded roster photos
  const attendanceImageUrl =
    record?.attendanceDocumentUrl ||
    record?.attendancePhotoUrl ||
    record?.attendancePhoto ||
    record?.attendance_photo ||
    record?.attendanceFile ||
    record?.attendanceDocument ||
    record?.attendanceSheet ||
    record?.studentAttendancePhoto;

  const checkInRef = record?.checkInPhoto || record?.checkInImage || record?.checkIn?.photo;
  if (attendanceImageUrl && attendanceImageUrl !== checkInRef) {
    const isPdf = String(attendanceImageUrl).toLowerCase().endsWith('.pdf');
    const isExcel = String(attendanceImageUrl).toLowerCase().endsWith('.xlsx') || String(attendanceImageUrl).toLowerCase().endsWith('.xls') || String(attendanceImageUrl).toLowerCase().endsWith('.csv');
    files.push({
      type: isPdf ? 'pdf' : (isExcel ? 'excel' : 'image'),
      name: isPdf ? 'Attendance PDF' : (isExcel ? 'Attendance Sheet / Document' : 'Student Attendance Sheet / Document'),
      url: getSecureImageUrl(attendanceImageUrl),
      originalUrl: attendanceImageUrl,
    });
  }

  // Extract from record.documents / record.scheduleDocuments
  const docs = Array.isArray(record?.documents) ? record.documents : (Array.isArray(record?.scheduleDocuments) ? record.scheduleDocuments : []);
  docs.forEach((doc, idx) => {
    const docUrl = doc?.fileUrl || doc?.url || (isValidGoogleDriveId(doc?.driveFileId) ? `https://lh3.googleusercontent.com/d/${doc.driveFileId}=w1200` : null);
    const docName = doc?.fileName || doc?.name || `Attendance Document ${idx + 1}`;
    const lowerName = String(docName).toLowerCase();
    const isPdf = lowerName.endsWith('.pdf') || doc?.fileType === 'attendance' || doc?.fileField === 'attendancePdf';
    const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv') || doc?.fileField === 'attendanceExcel';
    const isImage = lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.png') || lowerName.endsWith('.webp') || doc?.fileField === 'attendancePhoto' || doc?.fileField === 'attendance_photo' || doc?.fileField === 'studentsPhoto' || doc?.fileField === 'attendanceDocument';
    const isAttendanceType = doc?.fileType === 'attendance' || doc?.fileField?.includes('attendance') || /attendance|sheet|roster|certificate/i.test(docName);

    if (docUrl && (isPdf || isExcel || isImage || isAttendanceType)) {
      files.push({
        type: isPdf ? 'pdf' : (isExcel ? 'excel' : 'image'),
        name: docName,
        url: getSecureImageUrl(docUrl),
        originalUrl: docUrl,
      });
    }
  });

  return deduplicateByUrl(files);
};

const getStudentActivityEntries = (record = {}) => {
  const activities = [];
  if (Array.isArray(record?.activityPhotos) && record.activityPhotos.length) {
    record.activityPhotos.forEach((photo, idx) => {
      if (photo) {
        activities.push({
          type: 'image',
          title: `Activity Photo ${idx + 1}`,
          url: getSecureImageUrl(photo),
          originalUrl: photo,
        });
      }
    });
  }
  if (Array.isArray(record?.activityVideos) && record.activityVideos.length) {
    record.activityVideos.forEach((video, idx) => {
      if (video) {
        activities.push({
          type: 'video',
          title: `Activity Video ${idx + 1}`,
          url: getSecureImageUrl(video),
          originalUrl: video,
        });
      }
    });
  }

  const docs = Array.isArray(record?.documents) ? record.documents : [];
  docs.forEach((doc, idx) => {
    if (doc?.fileField === 'activityPhotos' || doc?.fileField === 'studentsPhoto') {
      const docUrl = doc?.fileUrl || (isValidGoogleDriveId(doc?.driveFileId) ? `https://lh3.googleusercontent.com/d/${doc.driveFileId}=w1200` : null);
      if (docUrl) {
        activities.push({
          type: 'image',
          title: doc.fileName || `Activity Photo ${activities.length + 1}`,
          url: getSecureImageUrl(docUrl),
          originalUrl: docUrl,
        });
      }
    }
  });

  return deduplicateByUrl(activities);
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

const resolveSessionMeta = (record = {}) => {
  const rawSession = String(
    record.session ||
    record.scheduleId?.session ||
    record.schedule?.session ||
    ''
  ).trim().toUpperCase();

  if (rawSession === 'FN' || rawSession === 'FORENOON' || rawSession === 'MORNING') {
    return { label: 'FN', color: 'blue' };
  }
  if (rawSession === 'AN' || rawSession === 'AFTERNOON' || rawSession === 'EVENING') {
    return { label: 'AN', color: 'purple' };
  }
  if (rawSession === 'FULL_DAY' || rawSession === 'FULL DAY' || rawSession === 'ALL_DAY') {
    return { label: 'Full Day', color: 'green' };
  }

  const startTime = record.startTime || record.scheduleId?.startTime || '';
  if (startTime) {
    const match = String(startTime).match(/^(\d{1,2})/);
    if (match) {
      const hour = parseInt(match[1], 10);
      if (hour < 12) return { label: 'FN', color: 'blue' };
      if (hour >= 12) return { label: 'AN', color: 'purple' };
    }
  }

  return { label: rawSession || 'Full Day', color: 'default' };
};

const toFiniteNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const getCheckOutEvidenceEntries = (record = {}) => {
    let entries = [];
    if (Array.isArray(record?.checkOut?.photos) && record.checkOut.photos.length) {
        entries = record.checkOut.photos
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
    } else if (Array.isArray(record?.checkOutGeoImageUrls) && record.checkOutGeoImageUrls.length) {
        entries = record.checkOutGeoImageUrls
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
    } else if (record?.checkOutGeoImageUrl) {
        const previewUrl = getSecureImageUrl(record.checkOutGeoImageUrl);
        if (previewUrl) {
            entries = [{
                key: 'legacy-single',
                url: record.checkOutGeoImageUrl,
                previewUrl,
                validationStatus: null,
                validationReason: null,
                latitude: null,
                longitude: null,
                distanceKm: null,
                capturedAt: null,
            }];
        }
    }

    return deduplicateByUrl(entries);
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
    row?.trainerId?.name,
    row?.trainerId?.trainerId,
    row?.trainerId?.userId?.email,
    row?.trainerId?.email,
    row?.collegeId?.name,
    row?.collegeId?.companyId?.name,
    row?.courseId?.title,
    row?.courseId?.name,
    row?.scheduleId?.courseId?.title,
    row?.scheduleId?.courseId?.name,
    row?.scheduleId?.subject,
    row?.subject,
    row?.syllabus,
    row?.status,
    row?.assignedDate,
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
            padding: "8px 10px",
            verticalAlign: "middle",
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
    const [updatingStatusId, setUpdatingStatusId] = useState(null);
    const debouncedSearchText = useDebouncedValue(searchText, 300);

    const handleToggleAttendanceStatus = async (record, newStatus) => {
      const attendanceId =
        record?._id ||
        record?.id ||
        record?.attendanceId ||
        (typeof record?.scheduleId === "object" ? record?.scheduleId?._id : record?.scheduleId);
      if (!attendanceId) {
        message.warning("Attendance ID not available for this record");
        return;
      }
      try {
        setUpdatingStatusId(attendanceId);
        await api.put(`/attendance/${attendanceId}/status`, { status: newStatus });
        message.success(`Status updated to ${newStatus}`);
        queryClient.invalidateQueries({ queryKey: ["trainer-overall-attendance"] });
      } catch (err) {
        console.error("Failed to update status:", err);
        message.error(err?.message || "Failed to update attendance status");
      } finally {
        setUpdatingStatusId(null);
      }
    };

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
            Date: (item.assignedDate || item.scheduleId?.scheduledDate || item.scheduleId?.date || item.date)
              ? dayjs(item.assignedDate || item.scheduleId?.scheduledDate || item.scheduleId?.date || item.date).format("DD MMM YYYY")
              : "-",
            "Trainer Name": item.trainerId?.userId?.name || item.trainerId?.name || "Unknown",
            "Trainer ID": item.trainerId?.trainerId || "-",
            "College Name": item.collegeId?.name || "-",
            "Course Name":
              item.courseId?.title ||
              item.courseId?.name ||
              item.scheduleId?.courseId?.title ||
              item.scheduleId?.courseId?.name ||
              item.scheduleId?.subject ||
              item.subject ||
              "-",
            "Check-In": formatTimeLabel(item.checkInTime || item.checkIn?.time),
            "Check-Out": formatTimeLabel(item.checkOutTime || item.checkOut?.time),
            Status: item.status || "-",
            "Assigned Day": item.dayNumber || item.scheduleId?.dayNumber || "-",
            Session: resolveSessionMeta(item).label,
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
          "Day",
          "Session",
          "Trainer",
          "College",
          "Course",
          "Check-In",
          "Check-Out",
          "Status",
          "Geo",
        ];
        const tableRows = await mapInBatches(
          exportRows,
          (item) => [
            (item.assignedDate || item.scheduleId?.scheduledDate || item.scheduleId?.date || item.date)
              ? dayjs(item.assignedDate || item.scheduleId?.scheduledDate || item.scheduleId?.date || item.date).format("DD MMM YYYY")
              : "-",
            item.dayNumber || item.scheduleId?.dayNumber || "-",
            resolveSessionMeta(item).label,
            item.trainerId?.userId?.name || item.trainerId?.name || "Unknown",
            item.collegeId?.name || "-",
            item.courseId?.title ||
              item.courseId?.name ||
              item.scheduleId?.courseId?.title ||
              item.scheduleId?.courseId?.name ||
              item.scheduleId?.subject ||
              item.subject ||
              "-",
            formatTimeLabel(item.checkInTime || item.checkIn?.time),
            formatTimeLabel(item.checkOutTime || item.checkOut?.time),
            item.status || "-",
            getGeoStatusMeta(item).label,
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
          accessorFn: (row) => {
            const raw = row.assignedDate || row.scheduleId?.scheduledDate || row.scheduleId?.date || row.date;
            return raw ? dayjs(raw).valueOf() : 0;
          },
          header: "Date",
          cell: ({ row }) => {
            const raw = row.original.assignedDate || row.original.scheduleId?.scheduledDate || row.original.scheduleId?.date || row.original.date;
            const dateStr = raw ? dayjs(raw).format("DD MMM YYYY") : "-";
            return (
              <Space size={6} style={{ whiteSpace: "nowrap" }}>
                <CalendarDays size={13} color="#8c8c8c" style={{ flexShrink: 0 }} />
                <Text style={{ whiteSpace: "nowrap", fontSize: "12px", fontWeight: 500 }}>{dateStr}</Text>
              </Space>
            );
          },
        },
        {
          id: "assignedDays",
          accessorFn: (row) => row.dayNumber || row.scheduleId?.dayNumber || 0,
          header: "Day Number",
          cell: ({ row }) => {
            const dayNum = row.original.dayNumber || row.original.scheduleId?.dayNumber;
            return (
              <Tag color="purple" style={{ fontWeight: 600, fontSize: "12px", margin: 0, whiteSpace: "nowrap" }}>
                {dayNum ? `Day ${dayNum}` : "-"}
              </Tag>
            );
          },
        },
        {
          id: "session",
          accessorFn: (row) => resolveSessionMeta(row).label,
          header: "Session",
          cell: ({ row }) => {
            const meta = resolveSessionMeta(row.original);
            return (
              <Tag
                color={meta.color}
                style={{
                  fontWeight: 600,
                  fontSize: "11px",
                  margin: 0,
                  whiteSpace: "nowrap",
                  textTransform: "uppercase"
                }}
              >
                {meta.label}
              </Tag>
            );
          },
        },
        {
          id: "trainer",
          accessorFn: (row) => row.trainerId?.userId?.name || row.trainerId?.name || "Unknown",
          header: "Trainer Name",
          cell: ({ row }) => {
            const name = row.original.trainerId?.userId?.name || row.original.trainerId?.name || "Unknown";
            const id = row.original.trainerId?.trainerId || "-";
            return (
              <div style={{ maxWidth: "100%", overflow: "hidden" }} title={`${name} (${id})`}>
                <Space size={5} style={{ maxWidth: "100%", overflow: "hidden" }}>
                  <UserRound size={13} color="#1890ff" style={{ flexShrink: 0 }} />
                  <Text strong style={{ fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "inline-block", maxWidth: 130 }}>
                    {name}
                  </Text>
                </Space>
                <div style={{ fontSize: "11px", color: "#8c8c8c", marginTop: 2, paddingLeft: 18, whiteSpace: "nowrap" }}>
                  ID: {id}
                </div>
              </div>
            );
          },
        },
        {
          id: "college",
          accessorFn: (row) => row.collegeId?.name || "",
          header: "College",
          cell: ({ row }) => {
            const collegeName = row.original.collegeId?.name || "-";
            return (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 6, maxWidth: "100%", overflow: "hidden" }} title={collegeName}>
                <Building2 size={14} color="#722ed1" style={{ flexShrink: 0, marginTop: 2 }} />
                <span
                  style={{
                    fontSize: "12px",
                    lineHeight: "1.35",
                    color: "#1f2937",
                    fontWeight: 600,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    wordBreak: "break-word"
                  }}
                >
                  {collegeName}
                </span>
              </div>
            );
          },
        },
        {
          id: "course",
          accessorFn: (row) =>
            row.courseId?.title ||
            row.courseId?.name ||
            row.scheduleId?.courseId?.title ||
            row.scheduleId?.courseId?.name ||
            row.collegeId?.courseId?.title ||
            row.collegeId?.courseId?.name ||
            row.subject ||
            row.scheduleId?.subject ||
            "",
          header: "Course Name",
          cell: ({ row }) => {
            const record = row.original;
            const courseName =
              record.courseId?.title ||
              record.courseId?.name ||
              record.scheduleId?.courseId?.title ||
              record.scheduleId?.courseId?.name ||
              record.collegeId?.courseId?.title ||
              record.collegeId?.courseId?.name ||
              record.subject ||
              record.scheduleId?.subject ||
              "-";
            return (
              <Tag
                color="geekblue"
                title={courseName}
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  maxWidth: 130,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "inline-block",
                  margin: 0
                }}
              >
                {courseName}
              </Tag>
            );
          },
        },
        {
          id: "checkIn",
          accessorFn: (row) => row.checkInTime || row.checkIn?.time || "",
          header: "Check-In",
          cell: ({ row }) => {
            const record = row.original;
            const formatted = formatTimeLabel(record.checkInTime || record.checkIn?.time);
            const checkInEntries = getCheckInEntries(record);
            const hasCheckIn = formatted !== "-";
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
                <Tag color={hasCheckIn ? "cyan" : "default"} icon={<Clock3 size={11} />} style={{ fontSize: "11px", margin: 0, whiteSpace: "nowrap" }}>
                  {formatted}
                </Tag>
                {hasCheckIn || checkInEntries.length > 0 ? (
                  <Button size="small" type="link" onClick={() => setSelectedGeoRecord(record)} style={{ padding: 0, fontSize: "11px", height: "auto", lineHeight: 1.2 }}>
                    View Check-In
                  </Button>
                ) : null}
              </div>
            );
          },
        },
        {
          id: "checkOut",
          accessorFn: (row) => row.checkOutTime || row.checkOut?.time || "",
          header: "Check-Out",
          cell: ({ row }) => {
            const record = row.original;
            const formatted = formatTimeLabel(record.checkOutTime || record.checkOut?.time);
            return (
              <Tag color={formatted !== "-" ? "blue" : "default"} icon={<Clock3 size={11} />} style={{ fontSize: "11px", margin: 0, whiteSpace: "nowrap" }}>
                {formatted}
              </Tag>
            );
          },
        },
        {
          id: "attendanceFiles",
          accessorFn: (row) => {
            const files = getAttendanceFileEntries(row);
            const studentCount = row.studentsPresent || (Array.isArray(row.students) ? row.students.length : 0);
            return files.length + studentCount;
          },
          header: "Student Attendance",
          cell: ({ row }) => {
            const record = row.original;
            const files = getAttendanceFileEntries(record);
            const studentCount = record.studentsPresent || (Array.isArray(record.students) ? record.students.filter(s => s.status === 'Present').length : 0);
            const totalRoster = (Array.isArray(record.students) && record.students.length > 0) ? record.students.length : 0;

            if (files.length > 0) {
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
                  <Space wrap size={4}>
                    {files.slice(0, 2).map((file, idx) => (
                      <Button
                        key={idx}
                        size="small"
                        type={file.type === 'pdf' ? 'primary' : 'default'}
                        danger={file.type === 'pdf'}
                        icon={file.type === 'pdf' ? <FileText size={11} /> : <FileSpreadsheet size={11} />}
                        href={file.url}
                        target="_blank"
                        style={{ fontSize: "11px", height: 22, padding: "0 6px" }}
                      >
                        {file.type === 'pdf' ? 'PDF' : (file.type === 'excel' ? 'Excel' : 'Sheet')}
                      </Button>
                    ))}
                  </Space>
                  <Button size="small" type="link" onClick={() => setSelectedGeoRecord(record)} style={{ padding: 0, fontSize: "11px", height: "auto", lineHeight: 1.2 }}>
                    View All Files
                  </Button>
                </div>
              );
            }

            if (studentCount > 0 || totalRoster > 0) {
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
                  <Tag color="cyan" style={{ fontSize: "11px", margin: 0, whiteSpace: "nowrap" }}>
                    {studentCount} Present {totalRoster > 0 ? `/ ${totalRoster}` : ''}
                  </Tag>
                  <Button size="small" type="link" onClick={() => setSelectedGeoRecord(record)} style={{ padding: 0, fontSize: "11px", height: "auto", lineHeight: 1.2 }}>
                    View Roster
                  </Button>
                </div>
              );
            }

            return <Text type="secondary" style={{ fontSize: "12px" }}>No files</Text>;
          },
        },
        {
          id: "studentActivities",
          accessorFn: (row) => getStudentActivityEntries(row).length,
          header: "Student Activities",
          cell: ({ row }) => {
            const record = row.original;
            const activities = getStudentActivityEntries(record);
            if (!activities.length) {
              return <Text type="secondary" style={{ fontSize: "12px" }}>No activities</Text>;
            }
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
                <Tag color="purple" style={{ fontSize: "11px", margin: 0, whiteSpace: "nowrap" }}>
                  {activities.length} activity item{activities.length > 1 ? 's' : ''}
                </Tag>
                <Button size="small" type="link" onClick={() => setSelectedGeoRecord(record)} style={{ padding: 0, fontSize: "11px", height: "auto", lineHeight: 1.2 }}>
                  View Activities
                </Button>
              </div>
            );
          },
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
              <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
                <Tag color={geoStatus.color} style={{ fontSize: "11px", margin: 0, whiteSpace: "nowrap" }}>{geoStatus.label}</Tag>
                {evidenceEntries.length > 0 ? (
                  <Button size="small" type="primary" ghost onClick={() => setSelectedGeoRecord(record)} style={{ fontSize: "11px", height: 22, padding: "0 6px", marginTop: 2 }}>
                    View Evidence
                  </Button>
                ) : (
                  <Text type="secondary" style={{ fontSize: "11px" }}>No evidence</Text>
                )}
              </div>
            );
          },
        },
        {
          id: "status",
          accessorFn: (row) => row.status || "",
          header: "Present / Absent",
          cell: ({ row }) => {
            const record = row.original;
            const rowId = record._id || record.id || record.attendanceId;
            const isUpdating = updatingStatusId === rowId;

            // Check if trainer checked in or has attendance artifacts
            const hasCheckIn = Boolean(
              record.checkInTime ||
              record.checkIn?.time ||
              record.checkInPhoto ||
              record.checkInImage ||
              record.imageUrl ||
              record.check_in_image ||
              record.clock_in_image
            );
            const hasFiles = Boolean(
              record.attendancePdfUrl ||
              record.studentAttendancePdfUrl ||
              record.attendanceExcelUrl ||
              record.studentAttendanceExcelUrl ||
              record.attendancePhoto ||
              record.attendancePhotoUrl ||
              record.studentsPhotoUrl ||
              (record.activityPhotos && record.activityPhotos.length > 0)
            );

            // Derive display status
            let effectiveStatus = record.status;
            if (!effectiveStatus || effectiveStatus === "Pending") {
              if (hasCheckIn || hasFiles) {
                effectiveStatus = "Present";
              } else {
                effectiveStatus = "Absent";
              }
            }

            const normStatus = String(effectiveStatus).trim().toLowerCase();
            const isPresent = normStatus === "present";
            const isAbsent = normStatus === "absent";
            const isPending = normStatus === "pending";

            let tagColor = "default";
            let tagIcon = null;
            let displayLabel = effectiveStatus;

            if (isPresent) {
              tagColor = "success";
              tagIcon = <CheckCircle2 size={12} style={{ marginRight: 3 }} />;
              displayLabel = "Present";
            } else if (isAbsent) {
              tagColor = "error";
              tagIcon = <XCircle size={12} style={{ marginRight: 3 }} />;
              displayLabel = "Absent";
            } else if (isPending) {
              tagColor = "warning";
              tagIcon = <Clock3 size={12} style={{ marginRight: 3 }} />;
              displayLabel = "Pending";
            } else {
              tagColor = "blue";
            }

            const menuItems = [
              {
                key: "Present",
                label: "Mark as Present",
                icon: <CheckCircle2 size={14} color="#52c41a" />,
                disabled: isPresent,
              },
              {
                key: "Absent",
                label: "Mark as Absent",
                icon: <XCircle size={14} color="#ff4d4f" />,
                disabled: isAbsent,
              },
              {
                key: "Pending",
                label: "Mark as Pending",
                icon: <Clock3 size={14} color="#faad14" />,
                disabled: isPending,
              },
            ];

            return (
              <div style={{ display: "flex", alignItems: "center", gap: 6, maxWidth: "100%", overflow: "hidden" }}>
                {isUpdating ? (
                  <Tag style={{ margin: 0, fontSize: "11px", display: "inline-flex", alignItems: "center", height: 24, padding: "0 6px" }}>
                    <Spin size="small" style={{ marginRight: 4 }} />
                    Updating...
                  </Tag>
                ) : (
                  <Tag
                    color={tagColor}
                    style={{
                      margin: 0,
                      fontSize: "11px",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      height: 24,
                      padding: "0 7px",
                      borderRadius: 4,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tagIcon}
                    {displayLabel}
                  </Tag>
                )}
                <Dropdown
                  menu={{
                    items: menuItems,
                    onClick: ({ key }) => handleToggleAttendanceStatus(record, key),
                  }}
                  trigger={["click"]}
                  disabled={isUpdating}
                >
                  <Button
                    size="small"
                    type="link"
                    style={{
                      height: 22,
                      padding: "0 2px",
                      fontSize: "11px",
                      fontWeight: 500,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 2,
                    }}
                    title="Change Status"
                  >
                    <Pencil size={11} />
                    <span>Edit</span>
                  </Button>
                </Dropdown>
              </div>
            );
          },
        },
      ],
      [updatingStatusId, handleToggleAttendanceStatus],
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

          <div style={{ overflowX: "auto", overflowY: "hidden", borderRadius: 8, border: "1px solid #f0f0f0", background: "#fff" }}>
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
                          padding: "10px 10px",
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
                title={
                  <Space>
                    <UserRound size={18} color="#1890ff" />
                    <span style={{ fontSize: "16px", fontWeight: 600 }}>
                      Day {selectedGeoRecord?.dayNumber || selectedGeoRecord?.scheduleId?.dayNumber || "1"} Attendance & Evidence Details - {selectedGeoRecord?.trainerId?.userId?.name || selectedGeoRecord?.trainerId?.name || 'Trainer'}
                    </span>
                  </Space>
                }
                onCancel={() => setSelectedGeoRecord(null)}
                footer={[
                    <Button key="close" type="primary" onClick={() => setSelectedGeoRecord(null)}>
                        Close
                    </Button>,
                ]}
                width={940}
            >
                {selectedGeoRecord ? (() => {
                    const checkOutEvidence = getCheckOutEvidenceEntries(selectedGeoRecord);
                    const checkInEvidence = getCheckInEntries(selectedGeoRecord);
                    const attendanceFiles = getAttendanceFileEntries(selectedGeoRecord);
                    const activityFiles = getStudentActivityEntries(selectedGeoRecord);
                    const geoStatus = getGeoStatusMeta(selectedGeoRecord);
                    const checkInLoc = getPreferredCheckInLocation(selectedGeoRecord);
                    const checkOutLoc = getPreferredCheckOutLocation(selectedGeoRecord);
                    const dayNum = selectedGeoRecord?.dayNumber || selectedGeoRecord?.scheduleId?.dayNumber || "1";
                    const formattedCheckIn = formatTimeLabel(selectedGeoRecord?.checkInTime || selectedGeoRecord?.checkIn?.time);
                    const formattedCheckOut = formatTimeLabel(selectedGeoRecord?.checkOutTime || selectedGeoRecord?.checkOut?.time);
                    const hasCheckInTime = formattedCheckIn !== "-";
                    const studentsList = Array.isArray(selectedGeoRecord?.students) ? selectedGeoRecord.students : [];
                    const presentCount = selectedGeoRecord?.studentsPresent ?? (studentsList.length > 0 ? studentsList.filter(s => s.status === 'Present').length : 0);
                    const absentCount = selectedGeoRecord?.studentsAbsent ?? (studentsList.length > 0 ? studentsList.filter(s => s.status === 'Absent').length : 0);
                    const totalStudents = presentCount + absentCount || studentsList.length || 0;
                    const attendancePercent = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : null;

                    const checkInMapsUrl =
                        checkInLoc?.hasCoords
                            ? `https://www.google.com/maps/search/?api=1&query=${checkInLoc.lat},${checkInLoc.lng}`
                            : null;

                    const checkOutMapsUrl =
                        Number.isFinite(checkOutLoc?.lat) && Number.isFinite(checkOutLoc?.lng)
                            ? `https://www.google.com/maps/search/?api=1&query=${checkOutLoc.lat},${checkOutLoc.lng}`
                            : null;

                    const studentColumns = [
                      {
                        title: "Roll No",
                        dataIndex: "rollNo",
                        key: "rollNo",
                        width: 100,
                        render: (val) => val || "-",
                      },
                      {
                        title: "Register No",
                        dataIndex: "registerNo",
                        key: "registerNo",
                        width: 130,
                        render: (val) => val || "-",
                      },
                      {
                        title: "Student Name",
                        dataIndex: "name",
                        key: "name",
                        render: (val) => <Text strong>{val || "Student"}</Text>,
                      },
                      {
                        title: "Attendance",
                        dataIndex: "status",
                        key: "status",
                        width: 110,
                        align: "center",
                        render: (status) => {
                          const isPresent = String(status || '').toLowerCase() === "present";
                          return (
                            <Tag color={isPresent ? "green" : "red"} style={{ fontWeight: 600 }}>
                              {isPresent ? "Present" : "Absent"}
                            </Tag>
                          );
                        },
                      },
                    ];

                    const tabItems = [
                      {
                        key: "checkin",
                        label: `📍 Check-In (${checkInEvidence.length > 0 ? `${checkInEvidence.length} file${checkInEvidence.length > 1 ? 's' : ''}` : (hasCheckInTime ? '✓ Logged' : '0')})`,
                        children: (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Check-In Overview Card */}
                            <Card size="small" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                                <div>
                                  <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trainer Details</Text>
                                  <div style={{ marginTop: 2 }}>
                                    <Text strong style={{ fontSize: '14px' }}>{selectedGeoRecord.trainerId?.userId?.name || selectedGeoRecord.trainerId?.name || 'Unknown Trainer'}</Text>
                                  </div>
                                  <Text type="secondary" style={{ fontSize: '12px' }}>
                                    ID: {selectedGeoRecord.trainerId?.trainerId || '-'} | {selectedGeoRecord.trainerId?.userId?.email || selectedGeoRecord.trainerId?.email || '-'}
                                  </Text>
                                </div>

                                <div>
                                  <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>College & Course</Text>
                                  <div style={{ marginTop: 2 }}>
                                    <Text strong style={{ fontSize: '13px' }}>{selectedGeoRecord.collegeId?.name || '-'}</Text>
                                  </div>
                                  <Text type="secondary" style={{ fontSize: '12px' }}>
                                    {selectedGeoRecord.courseId?.title || selectedGeoRecord.courseId?.name || selectedGeoRecord.scheduleId?.courseId?.title || selectedGeoRecord.scheduleId?.courseId?.name || selectedGeoRecord.subject || '-'}
                                  </Text>
                                </div>

                                <div>
                                  <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Session & Status</Text>
                                  <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    <Tag color="purple" style={{ fontWeight: 600 }}>Day {dayNum}</Tag>
                                    <Tag color={hasCheckInTime ? "cyan" : "default"} style={{ fontWeight: 600 }}>
                                      Check-In: {formattedCheckIn}
                                    </Tag>
                                    <Tag color={selectedGeoRecord.status === 'Present' ? 'green' : (selectedGeoRecord.status === 'Absent' ? 'red' : 'gold')} style={{ fontWeight: 600 }}>
                                      {selectedGeoRecord.status || 'Pending'}
                                    </Tag>
                                  </div>
                                  <Text type="secondary" style={{ fontSize: '12px', marginTop: 4, display: 'block' }}>
                                    Date: {selectedGeoRecord.date ? dayjs(selectedGeoRecord.date).format('DD MMM YYYY') : (selectedGeoRecord.assignedDate ? dayjs(selectedGeoRecord.assignedDate).format('DD MMM YYYY') : '-')}
                                  </Text>
                                </div>
                              </div>

                              {selectedGeoRecord.syllabus ? (
                                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                                  <Text type="secondary" style={{ fontSize: '12px' }}>Topic / Syllabus: </Text>
                                  <Tag color="geekblue" style={{ fontSize: '12px' }}>{selectedGeoRecord.syllabus}</Tag>
                                </div>
                              ) : null}

                              {checkInLoc?.hasCoords || checkInLoc?.address ? (
                                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                  <Space>
                                    <MapPin size={14} color="#10b981" />
                                    <Text style={{ fontSize: '12px' }}>
                                      Check-In Location: {checkInLoc.lat?.toFixed(4)}, {checkInLoc.lng?.toFixed(4)}
                                      {typeof checkInLoc.distanceFromCollege === 'number'
                                        ? ` (${Math.round(checkInLoc.distanceFromCollege)}m from college campus)`
                                        : ''}
                                    </Text>
                                  </Space>
                                  {checkInMapsUrl ? (
                                    <Button size="small" type="link" href={checkInMapsUrl} target="_blank" icon={<ExternalLink size={12} />} style={{ padding: 0 }}>
                                      Google Maps
                                    </Button>
                                  ) : null}
                                </div>
                              ) : null}
                            </Card>

                            {/* Check-In Photos and Signatures */}
                            {checkInEvidence.length > 0 ? (
                              <div>
                                <Title level={5} style={{ margin: '8px 0 12px 0' }}>
                                  Check-In Photos & Signatures ({checkInEvidence.length})
                                </Title>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                                  {checkInEvidence.map((entry) => (
                                    <Card key={entry.key} size="small" style={{ borderRadius: 8, overflow: 'hidden' }}>
                                      <div style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid #eee', background: '#f5f5f5', textAlign: 'center' }}>
                                        <Image
                                          src={entry.previewUrl}
                                          alt={entry.label}
                                          style={{ width: '100%', height: 180, objectFit: 'contain' }}
                                          preview={{ mask: 'Click to Preview' }}
                                          fallback="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='18' height='18' x='3' y='3' rx='2' ry='2'/><circle cx='9' cy='9' r='2'/><path d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/></svg>"
                                        />
                                      </div>
                                      <Text strong style={{ fontSize: '12px', marginTop: 8, display: 'block' }}>{entry.label}</Text>
                                      <Button size="small" type="link" href={entry.previewUrl} target="_blank" style={{ paddingLeft: 0, fontSize: '12px' }}>
                                        Open Full Image
                                      </Button>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <Card size="small" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                                <Space align="center">
                                  <CheckCircle2 size={16} color="#16a34a" />
                                  <Text style={{ fontSize: '13px', color: '#166534' }}>
                                    {hasCheckInTime
                                      ? `Check-in time was successfully recorded at ${formattedCheckIn}. No separate selfie/signature file was attached during check-in.`
                                      : 'No check-in record has been submitted yet for this session.'}
                                  </Text>
                                </Space>
                              </Card>
                            )}
                          </div>
                        )
                      },
                      {
                        key: "attendance",
                        label: `📄 Student Attendance (${attendanceFiles.length > 0 ? `${attendanceFiles.length} file${attendanceFiles.length > 1 ? 's' : ''}` : (totalStudents > 0 ? `${totalStudents} students` : '0')})`,
                        children: (
                          <div style={{ padding: '4px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Attendance Summary Counter Card */}
                            {(totalStudents > 0 || selectedGeoRecord?.studentsPresent > 0 || selectedGeoRecord?.studentsAbsent > 0) ? (
                              <Card size="small" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                  <div>
                                    <Text strong style={{ fontSize: '14px' }}>Session Student Attendance Summary</Text>
                                    <div style={{ marginTop: 6 }}>
                                      <Space wrap size={10}>
                                        <Tag color="green" style={{ fontSize: '13px', padding: '3px 10px', fontWeight: 600 }}>
                                          Present: {presentCount}
                                        </Tag>
                                        <Tag color="red" style={{ fontSize: '13px', padding: '3px 10px', fontWeight: 600 }}>
                                          Absent: {absentCount}
                                        </Tag>
                                        <Tag color="blue" style={{ fontSize: '13px', padding: '3px 10px', fontWeight: 500 }}>
                                          Total Students: {totalStudents}
                                        </Tag>
                                        {attendancePercent !== null ? (
                                          <Tag color={attendancePercent >= 75 ? "geekblue" : "orange"} style={{ fontSize: '13px', padding: '3px 10px', fontWeight: 600 }}>
                                            {attendancePercent}% Attendance
                                          </Tag>
                                        ) : null}
                                      </Space>
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            ) : null}

                            {/* Attendance Files Section */}
                            {attendanceFiles.length > 0 ? (
                              <div>
                                <Title level={5} style={{ margin: '4px 0 12px 0' }}>
                                  Uploaded Attendance Documents & Files ({attendanceFiles.length})
                                </Title>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                  {attendanceFiles.map((file, idx) => (
                                    <Card key={idx} size="small" style={{ borderRadius: 8 }}>
                                      {file.type === 'image' ? (
                                        <div>
                                          <div style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid #eee', background: '#f5f5f5', textAlign: 'center', marginBottom: 8 }}>
                                            <Image
                                              src={file.url}
                                              alt={file.name}
                                              style={{ width: '100%', maxHeight: 280, objectFit: 'contain' }}
                                              preview={{ mask: 'Click to Preview' }}
                                              fallback="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='18' height='18' x='3' y='3' rx='2' ry='2'/><circle cx='9' cy='9' r='2'/><path d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/></svg>"
                                            />
                                          </div>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                              <Text strong>{file.name}</Text>
                                              <br />
                                              <Text type="secondary" style={{ fontSize: '12px' }}>Student Attendance Document / Sheet Photo</Text>
                                            </div>
                                            <Button size="small" type="primary" href={file.url} target="_blank">
                                              Open Full Document
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                          <Space>
                                            {file.type === 'pdf' ? <FileText size={22} color="#ff4d4f" /> : <FileSpreadsheet size={22} color="#16a34a" />}
                                            <div>
                                              <Text strong style={{ fontSize: '13px' }}>{file.name}</Text>
                                              <br />
                                              <Text type="secondary" style={{ fontSize: '12px' }}>{file.type.toUpperCase()} Attendance Document</Text>
                                            </div>
                                          </Space>
                                          <Button type="primary" size="small" href={file.url} target="_blank" icon={<ExternalLink size={12} />}>
                                            View / Download
                                          </Button>
                                        </Space>
                                      )}
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            {/* Detailed Student Roster Table */}
                            {studentsList.length > 0 ? (
                              <div>
                                <Title level={5} style={{ margin: '8px 0 10px 0' }}>
                                  Student Attendance Roster ({studentsList.length} Students)
                                </Title>
                                <Table
                                  dataSource={studentsList.map((s, idx) => ({ ...s, key: s.studentId || s._id || idx }))}
                                  columns={studentColumns}
                                  size="small"
                                  pagination={{ pageSize: 10, showSizeChanger: false }}
                                  bordered
                                />
                              </div>
                            ) : null}

                            {/* Empty State */}
                            {attendanceFiles.length === 0 && studentsList.length === 0 && totalStudents === 0 ? (
                              <Empty
                                description="No student attendance PDF/Excel files or roster records uploaded for this session."
                                style={{ padding: '24px 0' }}
                              />
                            ) : null}
                          </div>
                        )
                      },
                      {
                        key: "activity",
                        label: `📸 Student Activities (${activityFiles.length})`,
                        children: (
                          <div style={{ padding: '4px 0' }}>
                            {activityFiles.length > 0 ? (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                                {activityFiles.map((item, idx) => (
                                  <Card key={idx} size="small" style={{ borderRadius: 8 }}>
                                    {item.type === 'image' ? (
                                      <div style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid #eee', background: '#f5f5f5', textAlign: 'center' }}>
                                        <Image
                                          src={item.url}
                                          alt={item.title}
                                          style={{ width: '100%', height: 200, objectFit: 'contain' }}
                                          preview={{ mask: 'Click to Preview' }}
                                        />
                                      </div>
                                    ) : (
                                      <div style={{ aspectRatio: '4/3', borderRadius: 6, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <video src={item.url} controls style={{ width: '100%', maxHeight: '100%' }} />
                                      </div>
                                    )}
                                    <Text strong style={{ fontSize: '13px', marginTop: 8, display: 'block' }}>{item.title}</Text>
                                    <Button size="small" type="link" href={item.url} target="_blank" style={{ paddingLeft: 0, fontSize: '12px' }}>
                                      Open File in New Tab
                                    </Button>
                                  </Card>
                                ))}
                              </div>
                            ) : (
                              <Empty
                                description="No student activity photos or videos uploaded for this session."
                                style={{ padding: '24px 0' }}
                              />
                            )}
                          </div>
                        )
                      },
                      {
                        key: "checkout",
                        label: `🏁 Check-Out (${checkOutEvidence.length > 0 ? `${checkOutEvidence.length}` : (formattedCheckOut !== '-' ? '✓ Logged' : '0')})`,
                        children: (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <Card size="small" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
                              <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                                <Space wrap>
                                  <Tag color={geoStatus.color} style={{ fontWeight: 600 }}>{geoStatus.label}</Tag>
                                  <Tag color="blue" style={{ fontWeight: 600 }}>
                                    Check-Out Time: {formattedCheckOut}
                                  </Tag>
                                </Space>
                                {checkOutLoc ? (
                                  <Text type="secondary" style={{ fontSize: '12px' }}>
                                    Check-Out Location: {checkOutLoc.lat ? checkOutLoc.lat.toFixed(4) : 'N/A'}, {checkOutLoc.lng ? checkOutLoc.lng.toFixed(4) : 'N/A'}
                                    {typeof checkOutLoc.distanceFromCollege === 'number'
                                      ? ` (${Math.round(checkOutLoc.distanceFromCollege)}m from college campus)`
                                      : ''}
                                  </Text>
                                ) : null}
                                {checkOutMapsUrl ? (
                                  <Button size="small" type="link" href={checkOutMapsUrl} target="_blank" icon={<ExternalLink size={12} />} style={{ paddingLeft: 0 }}>
                                    Open Google Maps
                                  </Button>
                                ) : null}
                              </Space>
                            </Card>

                            {checkOutEvidence.length > 0 ? (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                                {checkOutEvidence.map((entry, index) => (
                                  <Card key={entry.key} size="small" style={{ borderRadius: 8 }}>
                                    <div style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid #eee', background: '#f5f5f5', textAlign: 'center' }}>
                                      <Image src={entry.previewUrl} alt={`Check-out ${index + 1}`} style={{ width: '100%', height: 180, objectFit: 'contain' }} preview={{ mask: 'Click to Preview' }} />
                                    </div>
                                    <Text type="secondary" style={{ fontSize: '12px', marginTop: 6, display: 'block' }}>
                                      {entry.capturedAt ? `Captured ${dayjs(entry.capturedAt).format('DD MMM YYYY hh:mm A')}` : `Check-Out Photo ${index + 1}`}
                                    </Text>
                                    <Button size="small" type="link" href={entry.previewUrl} target="_blank" style={{ paddingLeft: 0, fontSize: '12px' }}>
                                      Open Full Image
                                    </Button>
                                  </Card>
                                ))}
                              </div>
                            ) : (
                              <Card size="small" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                                <Space align="center">
                                  <CheckCircle2 size={16} color="#16a34a" />
                                  <Text style={{ fontSize: '13px', color: '#166534' }}>
                                    {formattedCheckOut !== '-'
                                      ? `Check-out time was recorded at ${formattedCheckOut}. No check-out evidence photos were attached.`
                                      : 'No check-out photos recorded for this session.'}
                                  </Text>
                                </Space>
                              </Card>
                            )}
                          </div>
                        )
                      }
                    ];

                    return <Tabs defaultActiveKey="checkin" items={tabItems} />;
                })() : null}
            </Modal>
        </div>
    );
};

export default TrainerOverallAttendance;
