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
  Select,
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
  RotateCcw,
  CalendarCheck,
  Filter,
} from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
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
    const docField = String(doc?.fileField || '').toLowerCase();
    const docName = String(doc?.fileName || doc?.name || '').toLowerCase();
    return (
      docField === 'checkinphoto' ||
      docField === 'check_in_image' ||
      docField === 'clock_in_image' ||
      docField === 'photo' ||
      (doc?.fileType === 'geotag' && !docName.includes('checkout') && !docField.includes('checkout') && !docName.includes('activity'))
    );
  });

  const sigDocs = docs.filter((doc) => String(doc?.fileField || '').toLowerCase() === 'signature');

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
  const checkInRef = record?.checkInPhoto || record?.checkInImage || record?.checkIn?.photo;
  const checkOutRef = record?.checkOutGeoImageUrl;

  const docs = Array.isArray(record?.documents) ? record.documents : (Array.isArray(record?.scheduleDocuments) ? record.scheduleDocuments : []);
  const hasDriveAttendanceDoc = docs.some(doc => {
    const docField = String(doc?.fileField || '').toLowerCase();
    const docName = String(doc?.fileName || doc?.name || '').toLowerCase();
    return doc?.fileType === 'attendance' || docField.includes('attendance') || /attendance|sheet|roster/i.test(docName);
  });

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

  // Only add raw image URL if no Drive document exists or if it's already a full http URL
  if (attendanceImageUrl && attendanceImageUrl !== checkInRef && attendanceImageUrl !== checkOutRef && !/check.?in/i.test(attendanceImageUrl)) {
    const isDriveOrHttp = typeof attendanceImageUrl === 'string' && (attendanceImageUrl.startsWith('http') || isValidGoogleDriveId(attendanceImageUrl));
    if (!hasDriveAttendanceDoc || isDriveOrHttp) {
      const isPdf = String(attendanceImageUrl).toLowerCase().endsWith('.pdf');
      const isExcel = String(attendanceImageUrl).toLowerCase().endsWith('.xlsx') || String(attendanceImageUrl).toLowerCase().endsWith('.xls') || String(attendanceImageUrl).toLowerCase().endsWith('.csv');
      files.push({
        type: isPdf ? 'pdf' : (isExcel ? 'excel' : 'image'),
        name: isPdf ? 'Attendance PDF' : (isExcel ? 'Attendance Sheet / Document' : 'Student Attendance Sheet / Document'),
        url: getSecureImageUrl(attendanceImageUrl),
        originalUrl: attendanceImageUrl,
      });
    }
  }

  // Extract from record.documents / record.scheduleDocuments
  docs.forEach((doc, idx) => {
    const docUrl = doc?.fileUrl || doc?.url || (isValidGoogleDriveId(doc?.driveFileId) ? `https://lh3.googleusercontent.com/d/${doc.driveFileId}=w1200` : null);
    if (!docUrl) return;
    const docName = doc?.fileName || doc?.name || `Attendance Document ${idx + 1}`;
    const lowerName = String(docName).toLowerCase();
    const docField = String(doc?.fileField || '').toLowerCase();

    const isPdf = lowerName.endsWith('.pdf') || docField === 'attendancepdf' || docField === 'studentattendancepdf';
    const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv') || docField === 'attendanceexcel';
    
    // Explicit student attendance image docs only
    const isAttendanceImage = docField === 'attendancephoto' || docField === 'attendance_photo' || docField === 'attendancedocument';
    const isAttendanceType = (doc?.fileType === 'attendance' || /attendance|sheet|roster|student_list/i.test(docName)) && !/check.?in|check.?out|activity/i.test(lowerName) && !/check.?in|check.?out|activity/i.test(docField);

    if (isPdf || isExcel || isAttendanceImage || isAttendanceType) {
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
  const checkInRef = record?.checkInPhoto || record?.checkInImage || record?.checkIn?.photo;
  const checkOutRef = record?.checkOutGeoImageUrl;

  let rawPhotos = Array.isArray(record?.activityPhotos) ? record.activityPhotos.filter(Boolean) : [];
  // If drive URLs are available, filter out un-synced local paths
  const drivePhotos = rawPhotos.filter(p => typeof p === 'string' && (p.startsWith('http') || p.includes('googleusercontent') || p.includes('drive.google')));
  const effectivePhotos = drivePhotos.length > 0 ? drivePhotos : rawPhotos;

  effectivePhotos.forEach((photo, idx) => {
    if (photo && photo !== checkInRef && photo !== checkOutRef) {
      activities.push({
        type: 'image',
        title: `Activity Photo ${idx + 1}`,
        url: getSecureImageUrl(photo),
        originalUrl: photo,
      });
    }
  });

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
    const docField = String(doc?.fileField || '').toLowerCase();
    const docName = String(doc?.fileName || '').toLowerCase();
    if (docField === 'activityphotos' || docField === 'activityphoto' || docField === 'activityvideos' || doc?.fileType === 'activity' || /activity|classroom/i.test(docName)) {
      const docUrl = doc?.fileUrl || (isValidGoogleDriveId(doc?.driveFileId) ? `https://lh3.googleusercontent.com/d/${doc.driveFileId}=w1200` : null);
      if (docUrl && docUrl !== checkInRef && docUrl !== checkOutRef) {
        activities.push({
          type: docName.endsWith('.mp4') || docField === 'activityvideos' ? 'video' : 'image',
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
  if (rawSession === 'FULL_DAY' || rawSession === 'FULL DAY' || rawSession === 'ALL_DAY' || rawSession === 'FULLDAY') {
    return { label: 'Full Day', color: 'green' };
  }

  const startTime = record.startTime || record.scheduleId?.startTime || '';
  const endTime = record.endTime || record.scheduleId?.endTime || '';

  if (startTime) {
    const startMatch = String(startTime).match(/^(\d{1,2})/);
    const endMatch = String(endTime).match(/^(\d{1,2})/);
    const startHour = startMatch ? parseInt(startMatch[1], 10) : null;
    const endHour = endMatch ? parseInt(endMatch[1], 10) : null;

    if (startHour !== null) {
      if (startHour >= 12 || String(startTime).toUpperCase().includes('PM')) {
        return { label: 'AN', color: 'purple' };
      }
      if (endHour !== null && (endHour >= 16 || String(endTime).toUpperCase().includes('PM'))) {
        return { label: 'Full Day', color: 'green' };
      }
      if (endHour !== null && endHour <= 13) {
        return { label: 'FN', color: 'blue' };
      }
      return { label: 'FN', color: 'blue' };
    }
  }

  return { label: rawSession || 'Full Day', color: 'green' };
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
    const [datePreset, setDatePreset] = useState("all");
    const [selectedTrainerId, setSelectedTrainerId] = useState("");
    const [selectedDayNumber, setSelectedDayNumber] = useState("");
    const [selectedGeoRecord, setSelectedGeoRecord] = useState(null);
    const [page, setPage] = useState(1);
    const [exporting, setExporting] = useState(false);
    const [sorting, setSorting] = useState([{ id: "date", desc: true }]);
    const [updatingStatusId, setUpdatingStatusId] = useState(null);
    const debouncedSearchText = useDebouncedValue(searchText, 300);

    const { data: trainersList = [] } = useQuery({
      queryKey: ["trainers-attendance-filter-options"],
      queryFn: async () => {
        try {
          const res = await api.get("/trainers");
          const raw = Array.isArray(res) ? res : (res?.data || res?.trainers || []);
          return raw.map((t) => ({
            value: String(t._id),
            label: `${t.name || t.userId?.name || "Unknown Trainer"} (${t.trainerId || (t._id ? "ID: " + String(t._id).slice(-4) : "-")})`,
            name: t.name || t.userId?.name || "Unknown Trainer",
            trainerId: t.trainerId || "",
          }));
        } catch (err) {
          console.warn("Failed to fetch trainers list for filter:", err);
          return [];
        }
      },
      staleTime: 5 * 60 * 1000,
    });

    const dayOptions = useMemo(
      () => [
        { value: "", label: "All Days" },
        ...Array.from({ length: 30 }, (_, i) => ({
          value: i + 1,
          label: `Day ${i + 1}`,
        })),
      ],
      [],
    );

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
        trainerId: selectedTrainerId || "",
        dayNumber: selectedDayNumber || "",
      }),
      [
        debouncedSearchText,
        normalizedDateRange.endDate,
        normalizedDateRange.startDate,
        selectedTrainerId,
        selectedDayNumber,
      ],
    );

    const attendanceQuery = useTrainerOverallAttendanceQuery({
      page,
      limit: ATTENDANCE_PAGE_SIZE,
      searchText: attendanceFilters.searchText,
      startDate: attendanceFilters.startDate,
      endDate: attendanceFilters.endDate,
      trainerId: attendanceFilters.trainerId,
      dayNumber: attendanceFilters.dayNumber,
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
          trainerId: attendanceFilters.trainerId,
          dayNumber: attendanceFilters.dayNumber,
        }),
      );
    }, [
      attendanceFilters.endDate,
      attendanceFilters.searchText,
      attendanceFilters.startDate,
      attendanceFilters.trainerId,
      attendanceFilters.dayNumber,
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
            trainerId: attendanceFilters.trainerId,
            dayNumber: attendanceFilters.dayNumber,
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
              trainerId: attendanceFilters.trainerId,
              dayNumber: attendanceFilters.dayNumber,
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
      attendanceFilters.trainerId,
      attendanceFilters.dayNumber,
      queryClient,
    ]);

    const buildExportFileName = useCallback(
      (ext = "xlsx") => {
        const parts = ["Trainer_Overall_Attendance"];
        if (selectedTrainerId && trainersList.length > 0) {
          const matched = trainersList.find((t) => t.value === selectedTrainerId);
          if (matched) {
            parts.push(matched.name.replace(/[^a-zA-Z0-9_-]/g, "_"));
          }
        }
        if (selectedDayNumber) {
          parts.push(`Day${selectedDayNumber}`);
        }
        if (datePreset === "today") {
          parts.push(`Today_${dayjs().format("YYYY-MM-DD")}`);
        } else if (datePreset === "yesterday") {
          parts.push(`Yesterday_${dayjs().subtract(1, "day").format("YYYY-MM-DD")}`);
        } else if (dateRange?.[0] && dateRange?.[1]) {
          const s = dayjs(dateRange[0]).format("YYYY-MM-DD");
          const e = dayjs(dateRange[1]).format("YYYY-MM-DD");
          parts.push(s === e ? s : `${s}_to_${e}`);
        } else {
          parts.push(dayjs().format("YYYY-MM-DD"));
        }
        return `${parts.join("_")}.${ext}`;
      },
      [selectedTrainerId, trainersList, selectedDayNumber, datePreset, dateRange],
    );

    const buildPdfTitle = useCallback(() => {
      let title = "Trainer Overall Attendance Report";
      const subtitles = [];
      if (selectedTrainerId && trainersList.length > 0) {
        const matched = trainersList.find((t) => t.value === selectedTrainerId);
        if (matched) {
          subtitles.push(`Trainer: ${matched.name}`);
        }
      }
      if (selectedDayNumber) {
        subtitles.push(`Day ${selectedDayNumber}`);
      }
      if (datePreset === "today") {
        subtitles.push(`Today (${dayjs().format("DD MMM YYYY")})`);
      } else if (datePreset === "yesterday") {
        subtitles.push(`Yesterday (${dayjs().subtract(1, "day").format("DD MMM YYYY")})`);
      } else if (dateRange?.[0] && dateRange?.[1]) {
        const s = dayjs(dateRange[0]).format("DD MMM YYYY");
        const e = dayjs(dateRange[1]).format("DD MMM YYYY");
        subtitles.push(s === e ? s : `${s} to ${e}`);
      }
      if (subtitles.length > 0) {
        title += ` - ${subtitles.join(" | ")}`;
      }
      return title;
    }, [selectedTrainerId, trainersList, selectedDayNumber, datePreset, dateRange]);

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
        const filename = buildExportFileName("xlsx");
        await new Promise((resolve) => {
          runOnIdle(() => {
            XLSX.writeFile(wb, filename);
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

    const loadLogoBase64 = async (logoUrl = "/logos/tsmg.png") => {
      return new Promise((resolve) => {
        try {
          if (typeof window === "undefined") return resolve(null);
          const img = new window.Image();
          img.crossOrigin = "Anonymous";
          img.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = img.naturalWidth || img.width;
              canvas.height = img.naturalHeight || img.height;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0);
              const dataUrl = canvas.toDataURL("image/png");
              resolve({ dataUrl, width: canvas.width, height: canvas.height });
            } catch {
              resolve(null);
            }
          };
          img.onerror = () => resolve(null);
          img.src = logoUrl;
        } catch {
          resolve(null);
        }
      });
    };

    const handleExportPDF = async () => {
      try {
        setExporting(true);
        const exportRows = await fetchExportRows();
        if (!exportRows || exportRows.length === 0) {
          message.warning("No attendance records found to export.");
          return;
        }

        const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
          import("jspdf"),
          import("jspdf-autotable"),
        ]);

        const doc = new jsPDF("l", "mm", "a4");
        const logoImg = await loadLogoBase64("/logos/tsmg.png");

        // Compute metrics
        let presentCount = 0;
        let absentCount = 0;
        let pendingCount = 0;
        let verifiedCount = 0;

        exportRows.forEach((item) => {
          const rawStatus = String(item.status || "").trim().toLowerCase();
          const checkInVal = formatTimeLabel(item.checkInTime || item.checkIn?.time);
          const hasCheckIn = checkInVal !== "-";
          const isPresent = rawStatus === "present" || (rawStatus === "pending" && hasCheckIn);
          const isAbsent = rawStatus === "absent" || (rawStatus === "pending" && !hasCheckIn);

          if (isPresent) presentCount++;
          else if (isAbsent) absentCount++;
          else pendingCount++;

          const geoMeta = getGeoStatusMeta(item);
          if (geoMeta.label === "Verified") verifiedCount++;
        });

        // Resolve single trainer context if filtered
        const isSingleTrainer = Boolean(selectedTrainerId) || (
          exportRows.length > 0 &&
          exportRows.every(r => (r.trainerId?.trainerId || r.trainerId?._id) === (exportRows[0].trainerId?.trainerId || exportRows[0].trainerId?._id))
        );

        const matchedTrainer = selectedTrainerId ? trainersList.find(t => t.value === selectedTrainerId) : null;
        const trainerDisplayName = matchedTrainer?.name || exportRows[0]?.trainerId?.userId?.name || exportRows[0]?.trainerId?.name || "All Trainers";
        const trainerDisplayId = exportRows[0]?.trainerId?.trainerId || "-";
        const collegeDisplayName = exportRows[0]?.collegeId?.name || "All Colleges";
        const courseDisplayName = exportRows[0]?.courseId?.title || exportRows[0]?.courseId?.name || exportRows[0]?.scheduleId?.courseId?.title || exportRows[0]?.scheduleId?.courseId?.name || exportRows[0]?.scheduleId?.subject || exportRows[0]?.subject || "Multiple Courses";

        // Date Period String
        let periodLabel = "All Dates";
        if (datePreset === "today") periodLabel = `Today (${dayjs().format("DD MMM YYYY")})`;
        else if (datePreset === "yesterday") periodLabel = `Yesterday (${dayjs().subtract(1, "day").format("DD MMM YYYY")})`;
        else if (datePreset === "week") periodLabel = `This Week (${dayjs().startOf("week").format("DD MMM")} - ${dayjs().endOf("week").format("DD MMM YYYY")})`;
        else if (dateRange?.[0] && dateRange?.[1]) {
          const s = dayjs(dateRange[0]).format("DD MMM YYYY");
          const e = dayjs(dateRange[1]).format("DD MMM YYYY");
          periodLabel = s === e ? s : `${s} to ${e}`;
        }

        // Draw First Page Header
        if (logoImg?.dataUrl) {
          try {
            const logoW = 54;
            const logoH = logoImg.height && logoImg.width ? (logoImg.height / logoImg.width) * logoW : 14;
            doc.addImage(logoImg.dataUrl, "PNG", 14, 8, logoW, Math.min(logoH, 16));
          } catch (e) {
            console.warn("Could not render logo to PDF:", e);
          }
        }

        // Title Header Block (Right-aligned)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.setTextColor(30, 41, 59);
        doc.text("THE SM GROUPS", 283, 13, { align: "right" });

        doc.setFontSize(10);
        doc.setTextColor(220, 38, 38);
        doc.text("OFFICIAL TRAINER ATTENDANCE REPORT", 283, 19, { align: "right" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Generated: ${dayjs().format("DD MMM YYYY, hh:mm A")}`, 283, 24, { align: "right" });

        // Accent Divider Bar
        doc.setDrawColor(220, 38, 38);
        doc.setLineWidth(0.7);
        doc.line(14, 26.5, 283, 26.5);

        // Summary Card Box
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(14, 29.5, 269, 16.5, 1.5, 1.5, "FD");

        doc.setFontSize(8);
        if (isSingleTrainer) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 41, 59);
          doc.text(`Trainer: `, 18, 34.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(51, 65, 85);
          doc.text(`${trainerDisplayName} (ID: ${trainerDisplayId})`, 32, 34.5);

          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 41, 59);
          doc.text(`College: `, 115, 34.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(51, 65, 85);
          doc.text(`${collegeDisplayName.substring(0, 40)}`, 128, 34.5);

          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 41, 59);
          doc.text(`Period: `, 215, 34.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(51, 65, 85);
          doc.text(`${periodLabel}`, 226, 34.5);

          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 41, 59);
          doc.text(`Course: `, 18, 41);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(51, 65, 85);
          doc.text(`${courseDisplayName.substring(0, 45)}`, 32, 41);

          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 41, 59);
          doc.text(`Summary: `, 115, 41);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(51, 65, 85);
          doc.text(`Total: ${exportRows.length}  |  Present: ${presentCount}  |  Absent: ${absentCount}  |  Pending: ${pendingCount}  |  Geo Verified: ${verifiedCount}`, 130, 41);
        } else {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 41, 59);
          doc.text(`Scope: `, 18, 35.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(51, 65, 85);
          doc.text(`Overall Trainer Attendance Report (${exportRows.length} total entries)`, 30, 35.5);

          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 41, 59);
          doc.text(`Period: `, 190, 35.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(51, 65, 85);
          doc.text(`${periodLabel}`, 202, 35.5);

          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 41, 59);
          doc.text(`Attendance Summary: `, 18, 41.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(51, 65, 85);
          doc.text(`Present: ${presentCount}  |  Absent: ${absentCount}  |  Pending: ${pendingCount}  |  Geo Verified: ${verifiedCount}`, 52, 41.5);
        }

        // Table Data Preparation
        const tableColumn = [
          "#",
          "Date",
          "Day",
          "Session",
          "Trainer Name",
          "College Name",
          "Course Name",
          "Check-In",
          "Check-Out",
          "Status",
          "Geo Status",
        ];

        const tableRows = await mapInBatches(
          exportRows,
          (item, idx) => {
            const rawDate = item.assignedDate || item.scheduleId?.scheduledDate || item.scheduleId?.date || item.date;
            const dateStr = rawDate ? dayjs(rawDate).format("DD MMM YYYY") : "-";
            const dayNum = item.dayNumber || item.scheduleId?.dayNumber;
            const dayStr = dayNum ? `Day ${dayNum}` : "-";
            const sessionLabel = resolveSessionMeta(item).label;
            const tName = item.trainerId?.userId?.name || item.trainerId?.name || "Unknown";
            const tId = item.trainerId?.trainerId ? ` (${item.trainerId.trainerId})` : "";
            const collegeName = item.collegeId?.name || "-";
            const courseName =
              item.courseId?.title ||
              item.courseId?.name ||
              item.scheduleId?.courseId?.title ||
              item.scheduleId?.courseId?.name ||
              item.scheduleId?.subject ||
              item.subject ||
              "-";
            const inTime = formatTimeLabel(item.checkInTime || item.checkIn?.time);
            const outTime = formatTimeLabel(item.checkOutTime || item.checkOut?.time);

            const rawStatus = String(item.status || "").trim().toLowerCase();
            let displayStatus = item.status || "-";
            if (!item.status || rawStatus === "pending") {
              displayStatus = inTime !== "-" ? "Present" : "Absent";
            }

            const geoStatus = getGeoStatusMeta(item).label;

            return [
              idx + 1,
              dateStr,
              dayStr,
              sessionLabel,
              `${tName}${tId}`,
              collegeName,
              courseName,
              inTime,
              outTime,
              displayStatus,
              geoStatus,
            ];
          },
          { batchSize: 300 },
        );

        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 49,
          theme: "grid",
          styles: {
            fontSize: 7.5,
            cellPadding: 2,
            overflow: "linebreak",
            lineColor: [226, 232, 240],
            lineWidth: 0.15,
            valign: "middle",
          },
          headStyles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 8,
            halign: "center",
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252],
          },
          columnStyles: {
            0: { cellWidth: 10, halign: "center" },
            1: { cellWidth: 23, halign: "center" },
            2: { cellWidth: 14, halign: "center" },
            3: { cellWidth: 16, halign: "center", fontStyle: "bold" },
            4: { cellWidth: 40, halign: "left" },
            5: { cellWidth: 46, halign: "left" },
            6: { cellWidth: 38, halign: "left" },
            7: { cellWidth: 22, halign: "center" },
            8: { cellWidth: 22, halign: "center" },
            9: { cellWidth: 20, halign: "center", fontStyle: "bold" },
            10: { cellWidth: 18, halign: "center" },
          },
          willDrawCell: (data) => {
            if (data.section === "body") {
              // Colorize Session Column
              if (data.column.index === 3) {
                const sess = String(data.cell.raw || "");
                if (sess === "FN") data.cell.styles.textColor = [2, 132, 199];
                else if (sess === "AN") data.cell.styles.textColor = [147, 51, 234];
                else if (sess === "Full Day") data.cell.styles.textColor = [22, 163, 74];
              }
              // Colorize Status Column
              if (data.column.index === 9) {
                const st = String(data.cell.raw || "").toLowerCase();
                if (st.includes("present")) data.cell.styles.textColor = [22, 163, 74];
                else if (st.includes("absent")) data.cell.styles.textColor = [220, 38, 38];
                else if (st.includes("pending") || st.includes("late")) data.cell.styles.textColor = [217, 119, 6];
              }
            }
          },
          didDrawPage: (data) => {
            const pageNum = data.pageNumber;
            // Mini Header on subsequent pages
            if (pageNum > 1) {
              doc.setFont("helvetica", "bold");
              doc.setFontSize(8);
              doc.setTextColor(71, 85, 105);
              doc.text("THE SM GROUPS  |  Trainer Attendance Report", 14, 10);
              doc.setFont("helvetica", "normal");
              doc.setFontSize(7.5);
              doc.setTextColor(148, 163, 184);
              doc.text(`Period: ${periodLabel}`, 283, 10, { align: "right" });
              doc.setDrawColor(226, 232, 240);
              doc.setLineWidth(0.3);
              doc.line(14, 12, 283, 12);
            }
          },
        });

        // 2nd Pass: Page Footers with total page count
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.3);
          doc.line(14, 200, 283, 200);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(148, 163, 184);
          doc.text("Confidential - For Official Use Only  |  THE SM GROUPS", 14, 204.5);
          doc.text(`Page ${i} of ${totalPages}`, 283, 204.5, { align: "right" });
        }

        const filename = isSingleTrainer
          ? `Trainer_Attendance_${trainerDisplayName.replace(/[^a-zA-Z0-9]/g, "_")}_${dayjs().format("YYYY-MM-DD")}.pdf`
          : buildExportFileName("pdf");

        await new Promise((resolve) => {
          runOnIdle(() => {
            doc.save(filename);
            resolve();
          }, 1000);
        });

        message.success("Professional Attendance PDF exported successfully");
      } catch (error) {
        console.error("PDF Export Error:", error);
        message.error("Failed to export PDF report");
      } finally {
        setExporting(false);
      }
    };

    const handlePresetClick = useCallback((preset) => {
      setDatePreset(preset);
      setPage(1);
      if (preset === "today") {
        setDateRange([dayjs().startOf("day"), dayjs().endOf("day")]);
      } else if (preset === "yesterday") {
        setDateRange([
          dayjs().subtract(1, "day").startOf("day"),
          dayjs().subtract(1, "day").endOf("day"),
        ]);
      } else if (preset === "week") {
        setDateRange([dayjs().startOf("week"), dayjs().endOf("week")]);
      } else if (preset === "all") {
        setDateRange(null);
      }
    }, []);

    const handleDateRangeChange = useCallback((values) => {
      setDateRange(values);
      setDatePreset(values ? "custom" : "all");
      setPage(1);
    }, []);

    const handleTrainerChange = useCallback((val) => {
      setSelectedTrainerId(val || "");
      setPage(1);
    }, []);

    const handleDayNumberChange = useCallback((val) => {
      setSelectedDayNumber(val || "");
      setPage(1);
    }, []);

    const handleSearchChange = useCallback((event) => {
      setSearchText(event.target.value);
      setPage(1);
    }, []);

    const handleResetFilters = useCallback(() => {
      setSearchText("");
      setDateRange(null);
      setDatePreset("all");
      setSelectedTrainerId("");
      setSelectedDayNumber("");
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
          {/* Header Row: Title & Action Exports */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Title level={2} style={{ margin: 0 }}>
                  Overall Attendance
                </Title>
                <Tag color="blue" style={{ fontSize: "12px", fontWeight: 600, padding: "2px 8px" }}>
                  {pagination.total || data.length} Records
                </Tag>
              </div>
              <Text type="secondary" style={{ fontSize: "14px", fontWeight: 500 }}>
                View, filter, and download trainer attendance across dates, days, and individual trainers
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
                icon={<FileSpreadsheet size={15} />}
                onClick={handleExportExcel}
                disabled={loading || exporting || (pagination.total === 0 && data.length === 0)}
                loading={exporting}
                style={{ backgroundColor: "#1d7044", borderColor: "#1d7044", fontWeight: 600 }}
              >
                Export Excel
              </Button>
              <Button
                type="primary"
                danger
                icon={<FileText size={15} />}
                onClick={handleExportPDF}
                disabled={loading || exporting || (pagination.total === 0 && data.length === 0)}
                loading={exporting}
                style={{ fontWeight: 600 }}
              >
                Export PDF
              </Button>
            </Space>
          </div>

          {/* Quick Filter Presets & Filter Controls */}
          <div
            style={{
              background: "#f8fafc",
              padding: "14px 16px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              marginBottom: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {/* Quick Date Presets */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <Text style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginRight: "4px" }}>
                Quick Date:
              </Text>
              <Button
                size="small"
                type={datePreset === "today" ? "primary" : "default"}
                icon={<CalendarCheck size={13} />}
                onClick={() => handlePresetClick("today")}
                style={{ borderRadius: "6px", fontWeight: 500 }}
              >
                Today
              </Button>
              <Button
                size="small"
                type={datePreset === "yesterday" ? "primary" : "default"}
                onClick={() => handlePresetClick("yesterday")}
                style={{ borderRadius: "6px", fontWeight: 500 }}
              >
                Yesterday
              </Button>
              <Button
                size="small"
                type={datePreset === "week" ? "primary" : "default"}
                onClick={() => handlePresetClick("week")}
                style={{ borderRadius: "6px", fontWeight: 500 }}
              >
                This Week
              </Button>
              <Button
                size="small"
                type={datePreset === "all" && !dateRange ? "primary" : "default"}
                onClick={() => handlePresetClick("all")}
                style={{ borderRadius: "6px", fontWeight: 500 }}
              >
                All Dates
              </Button>
            </div>

            {/* Granular Filters: Date Range, Day Number, Trainer, Search & Reset */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <RangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
                style={{ width: 260 }}
                placeholder={["Start Date", "End Date"]}
                allowClear
              />
              <Select
                value={selectedDayNumber || undefined}
                onChange={handleDayNumberChange}
                options={dayOptions}
                placeholder="Select Day Number"
                style={{ width: 140 }}
                allowClear
              />
              <Select
                showSearch
                optionFilterProp="label"
                value={selectedTrainerId || undefined}
                onChange={handleTrainerChange}
                options={[{ value: "", label: "All Trainers" }, ...trainersList]}
                placeholder="Filter Particular Trainer"
                style={{ width: 260 }}
                allowClear
              />
              <Input
                placeholder="Search trainer, college, course..."
                prefix={<Search size={14} color="#94a3b8" />}
                style={{ width: 260 }}
                value={searchText}
                onChange={handleSearchChange}
                allowClear
              />
              <Button
                icon={<RotateCcw size={13} />}
                onClick={handleResetFilters}
                style={{ borderRadius: "6px" }}
              >
                Reset
              </Button>
            </div>
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
