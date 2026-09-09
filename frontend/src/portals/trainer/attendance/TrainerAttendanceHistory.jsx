"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Clock3,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  Info,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";
import { getSecureImageUrl } from "@/utils/imageUtils";

/* ─── helpers ───────────────────────────────────────────────── */
const formatCoord = (val) =>
  typeof val === "number" ? val.toFixed(5) : "—";

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(dateStr);
  }
};

const formatTime = (timeStr, fallbackDate) => {
  const target = timeStr || fallbackDate;
  if (!target) return "—";

  if (typeof target === "string") {
    const trimmed = target.trim();
    // If it's already a simple time format like "10:05 AM" or "09:30"
    if (/^\d{1,2}:\d{2}(\s?[APap][Mm])?$/.test(trimmed)) {
      return trimmed;
    }
    // If it is an ISO string or date parseable string
    try {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }
    } catch {
      // ignore
    }
    return trimmed;
  }

  if (target instanceof Date && !isNaN(target.getTime())) {
    return target.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  return "—";
};

const formatDuration = (minutes) => {
  if (!minutes || isNaN(minutes) || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h} hr${h > 1 ? "s" : ""}`;
  return `${m} mins`;
};

const resolveImageUrl = (path) => {
  if (!path) return "";
  const secure = getSecureImageUrl(path);
  if (secure) return secure;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/api$/, "");
  let processedPath = path;
  if (!processedPath.startsWith("/") && !processedPath.startsWith("uploads/")) {
    processedPath = `/uploads/${processedPath}`;
  } else if (processedPath.startsWith("uploads/")) {
    processedPath = `/${processedPath}`;
  } else if (processedPath.startsWith("/") && !processedPath.startsWith("/uploads/")) {
    processedPath = `/uploads${processedPath}`;
  }

  if (apiBase) {
    return `${apiBase}${processedPath}`;
  }
  return processedPath;
};

/* ─── style mappings ────────────────────────────────────────── */
const STATUS_CONFIG = {
  Present: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/10",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
    label: "Present",
  },
  Absent: {
    badge: "bg-rose-50 text-rose-700 border-rose-200 ring-rose-600/10",
    dot: "bg-rose-500",
    icon: XCircle,
    label: "Absent",
  },
  Leave: {
    badge: "bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/10",
    dot: "bg-amber-500",
    icon: Clock3,
    label: "Leave",
  },
  Pending: {
    badge: "bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/10",
    dot: "bg-amber-500",
    icon: Clock3,
    label: "Pending",
  },
};

const VERIF_CONFIG = {
  approved: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    label: "Verified / Approved",
  },
  pending: {
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    label: "Pending Review",
  },
  rejected: {
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    label: "Rejected",
  },
};

/* ─── component ─────────────────────────────────────────────── */
function TrainerAttendanceHistory() {
  const { currentUser } = useAuth();
  const [records, setRecords] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [verifFilter, setVerifFilter] = useState("ALL");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const trainerId =
    currentUser?.trainerProfileId ||
    currentUser?.trainerId ||
    currentUser?.trainer_id ||
    currentUser?.id ||
    currentUser?._id;

  const fetchHistoryAndSchedules = useCallback(async () => {
    if (!trainerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [attRes, schedRes] = await Promise.allSettled([
        api.get(`/attendance/trainer/${trainerId}`),
        api.get(`/schedules/trainer/${trainerId}`),
      ]);

      const extractArray = (raw) => {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw.data)) return raw.data;
        if (Array.isArray(raw.data?.data)) return raw.data.data;
        if (Array.isArray(raw.schedules)) return raw.schedules;
        return [];
      };

      if (attRes.status === "fulfilled") {
        setRecords(extractArray(attRes.value));
      } else {
        console.warn("Attendance fetch warning:", attRes.reason);
        setRecords([]);
      }

      if (schedRes.status === "fulfilled") {
        setSchedules(extractArray(schedRes.value));
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load attendance history."
      );
    } finally {
      setLoading(false);
    }
  }, [trainerId]);

  useEffect(() => {
    fetchHistoryAndSchedules();
  }, [fetchHistoryAndSchedules]);

  /* ── Merged Attendance Records (incorporating missed past schedules as Absent) ──── */
  const mergedRecords = useMemo(() => {
    const todayYMD = new Date().toISOString().split("T")[0];

    const toYMD = (dateStr) => {
      if (!dateStr) return "";
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "";
        return d.toISOString().split("T")[0];
      } catch {
        return "";
      }
    };

    const combined = [...records];

    schedules.forEach((sched) => {
      const sId = String(sched._id || sched.id || "");
      const schedDate = sched.scheduledDate || sched.date;
      if (!schedDate) return;

      const schedYMD = toYMD(schedDate);
      if (!schedYMD) return;

      // Check past schedules (before today)
      if (schedYMD < todayYMD) {
        const hasMatchingAttendance = records.some((r) => {
          const rSchedId = String(
            (typeof r.scheduleId === "object" ? r.scheduleId?._id : r.scheduleId) || ""
          );
          if (sId && rSchedId && sId === rSchedId) {
            return true;
          }
          // If attendance record has no scheduleId attached, match by Date and Day Number
          if (!rSchedId) {
            const rYMD = toYMD(r.date || r.assignedDate || r.checkInTime || r.createdAt);
            const rDay = Number(r.dayNumber || 1);
            const sDay = Number(sched.dayNumber || 1);
            if (rYMD === schedYMD && rDay === sDay) {
              return true;
            }
          }
          return false;
        });

        if (!hasMatchingAttendance) {
          combined.push({
            _id: `absent-sched-${sId || schedYMD}-${sched.dayNumber || 1}`,
            scheduleId: sched,
            collegeId: sched.collegeId || (sched.collegeName ? { name: sched.collegeName } : null),
            courseId: sched.courseId || (sched.courseTitle ? { name: sched.courseTitle } : null),
            date: schedDate,
            dayNumber: sched.dayNumber || 1,
            status: "Absent",
            attendanceStatus: "Absent",
            verificationStatus: "approved",
            isSyntheticAbsent: true,
            checkInTime: null,
            checkOutTime: null,
            remarks: "Trainer did not check-in for scheduled class",
          });
        }
      }
    });

    return combined.sort((a, b) => {
      const dA = new Date(a.date || a.assignedDate || a.createdAt || 0).getTime();
      const dB = new Date(b.date || b.assignedDate || b.createdAt || 0).getTime();
      return dB - dA;
    });
  }, [records, schedules]);

  /* ── Stats computation ─────────────────────────────────────── */
  const stats = useMemo(() => {
    const total = mergedRecords.length;
    let present = 0;
    let absent = 0;
    let approved = 0;
    let pending = 0;

    mergedRecords.forEach((r) => {
      const s = String(r.status || r.attendanceStatus || "").toLowerCase();
      if (s === "present") present += 1;
      else if (s === "absent") absent += 1;

      const v = String(r.verificationStatus || "").toLowerCase();
      if (v === "approved") approved += 1;
      else if (v === "pending") pending += 1;
    });

    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    return { total, present, absent, approved, pending, rate };
  }, [mergedRecords]);

  /* ── Filtered Records ──────────────────────────────────────── */
  const filteredRecords = useMemo(() => {
    return mergedRecords.filter((rec) => {
      // Status filter
      if (statusFilter !== "ALL") {
        const s = String(rec.status || rec.attendanceStatus || "").toUpperCase();
        if (s !== statusFilter) return false;
      }

      // Verification filter
      if (verifFilter !== "ALL") {
        const v = String(rec.verificationStatus || "").toLowerCase();
        if (v !== verifFilter.toLowerCase()) return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const collegeName = String(rec.collegeId?.name || "").toLowerCase();
        const collegeCity = String(rec.collegeId?.city || "").toLowerCase();
        const courseName = String(
          rec.courseId?.name || rec.courseId?.title || rec.scheduleId?.subject || ""
        ).toLowerCase();
        const dateStr = formatDate(rec.date || rec.assignedDate || rec.createdAt).toLowerCase();
        const dayStr = `day ${rec.dayNumber || ""}`.toLowerCase();

        return (
          collegeName.includes(q) ||
          collegeCity.includes(q) ||
          courseName.includes(q) ||
          dateStr.includes(q) ||
          dayStr.includes(q)
        );
      }

      return true;
    });
  }, [mergedRecords, statusFilter, verifFilter, searchTerm]);

  /* ── Today's active visit info (if any) ─────────────────────── */
  const todaySession = useMemo(() => {
    const todayYMD = new Date().toISOString().split("T")[0];
    return schedules.find((s) => {
      const sDate = s.scheduledDate || s.date;
      if (!sDate) return false;
      const sYMD = new Date(sDate).toISOString().split("T")[0];
      return sYMD === todayYMD;
    });
  }, [schedules]);

  return (
    <div className="space-y-6">
      {/* ── Today's Session Quick-Action Banner ──────────────────── */}
      {todaySession && (
        <div className="relative overflow-hidden rounded-[24px] border border-blue-200 bg-gradient-to-br from-[#0f3f5c] via-[#15537a] to-[#1a6b9e] p-5 text-white shadow-md sm:p-6">
          <div className="relative z-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>Today&apos;s Active Assignment</span>
              </div>
              <h3 className="text-lg font-bold sm:text-xl">
                {todaySession.collegeId?.name || todaySession.collegeName || "College Visit"}
              </h3>
              <p className="text-xs text-blue-100 sm:text-sm">
                Day {todaySession.dayNumber || 1} • {todaySession.courseId?.name || todaySession.courseTitle || todaySession.subject || "Scheduled Class"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/trainer/activities"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#0f3f5c] shadow-sm transition hover:bg-blue-50 active:scale-95 sm:text-sm"
              >
                <span>Go to Daily Workflow / Clock-In</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/trainer/schedule"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 sm:text-sm"
              >
                <Calendar className="h-4 w-4" />
                <span>Schedule</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── KPI Summary Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Total Sessions */}
        <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Logged
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#0f3f5c]">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 sm:text-3xl">
              {stats.total}
            </span>
            <span className="text-xs text-slate-500">sessions</span>
          </div>
        </div>

        {/* Present Days */}
        <div className="rounded-[20px] border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm transition hover:border-emerald-300 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Present Days
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 sm:text-3xl">
              {stats.present}
            </span>
            <span className="inline-flex items-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-800">
              {stats.rate}% rate
            </span>
          </div>
        </div>

        {/* Absent Days */}
        <div className="rounded-[20px] border border-rose-200 bg-rose-50/40 p-4 shadow-sm transition hover:border-rose-300 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-800">
              Absent / Missed
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
              <XCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-700 sm:text-3xl">
              {stats.absent}
            </span>
            <span className="text-xs text-rose-600">days</span>
          </div>
        </div>

        {/* Approved / Verified */}
        <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Verification Status
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Clock3 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 sm:text-3xl">
              {stats.approved}
            </span>
            <span className="text-xs text-slate-500">
              / {stats.total} approved ({stats.pending} pending)
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Attendance History Section ─────────────────────── */}
      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm sm:rounded-[28px]">
        {/* Header & Filter Bar */}
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/60 p-4 sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                Attendance Log Records
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                Showing all recorded sessions, GPS check-in/out timestamps, and SPOC verifications.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchHistoryAndSchedules}
              disabled={loading}
              className="inline-flex items-center gap-1.5 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:opacity-60 md:self-auto"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Log</span>
            </button>
          </div>

          {/* Search and Filters */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search college, course, date, day..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 transition focus:border-[#0f3f5c] focus:outline-none focus:ring-1 focus:ring-[#0f3f5c] sm:text-sm"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition focus:border-[#0f3f5c] focus:outline-none focus:ring-1 focus:ring-[#0f3f5c] sm:text-sm"
              >
                <option value="ALL">All Attendance Status</option>
                <option value="PRESENT">Present Only</option>
                <option value="ABSENT">Absent Only</option>
              </select>
            </div>

            {/* Verification Filter */}
            <div>
              <select
                value={verifFilter}
                onChange={(e) => setVerifFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition focus:border-[#0f3f5c] focus:outline-none focus:ring-1 focus:ring-[#0f3f5c] sm:text-sm"
              >
                <option value="ALL">All Verification Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending Review</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Content Area ────────────────────────────────────────── */}
        <div className="p-4 sm:p-6">
          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-sm text-slate-500">
              <Loader2 className="h-7 w-7 animate-spin text-[#0f3f5c]" />
              <p className="font-medium text-slate-700">Loading your attendance history…</p>
              <p className="text-xs text-slate-400">Fetching verified check-in, check-out, and college data</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-rose-800">Failed to load attendance records</h4>
                <p className="mt-0.5 text-xs text-rose-700">{error}</p>
                <button
                  type="button"
                  onClick={fetchHistoryAndSchedules}
                  className="mt-2 text-xs font-semibold text-rose-800 underline hover:no-underline"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredRecords.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Clock3 className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">No attendance records found</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm">
                  {mergedRecords.length > 0
                    ? "No records matched your search filter criteria. Try clearing the filter."
                    : "You don't have any past attendance records logged yet."}
                </p>
              </div>
              {mergedRecords.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("ALL");
                    setVerifFilter("ALL");
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Clear Filters
                </button>
              ) : (
                <Link
                  href="/trainer/activities"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f3f5c] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#1a6b9e]"
                >
                  <span>Go to Daily Workflow</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          )}

          {/* Records List / Grid */}
          {!loading && !error && filteredRecords.length > 0 && (
            <div className="space-y-4">
              {filteredRecords.map((record, idx) => {
                const rawStatus = String(record.status || record.attendanceStatus || "Pending").trim();
                const normalizedStatus =
                  rawStatus.toLowerCase() === "present"
                    ? "Present"
                    : rawStatus.toLowerCase() === "absent"
                    ? "Absent"
                    : "Pending";
                const statusCfg = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.Pending;
                const StatusIcon = statusCfg.icon;

                const rawVerif = String(record.verificationStatus || "pending").toLowerCase();
                const verifCfg = VERIF_CONFIG[rawVerif] || VERIF_CONFIG.pending;

                const collegeName = record.collegeId?.name || "Assigned College";
                const collegeLocation = record.collegeId?.city || record.collegeId?.state || "";
                const courseName =
                  record.courseId?.name ||
                  record.courseId?.title ||
                  record.scheduleId?.subject ||
                  "General Training";
                const dayNum = record.dayNumber || record.scheduleId?.dayNumber || 1;
                const duration = formatDuration(record.workingDurationMinutes);

                const checkInImg = record.checkInImage || record.imageUrl;
                const checkOutImg = record.checkOutImage || record.checkOutGeoImageUrl;

                return (
                  <div
                    key={record._id || record.id || idx}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-blue-200 hover:shadow-md"
                  >
                    {/* Top Row: Date, Day, College, Status */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-6">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900 sm:text-sm">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {formatDate(record.date || record.assignedDate || record.createdAt)}
                        </span>
                        <span className="inline-flex items-center rounded-md bg-[#0f3f5c]/10 px-2 py-0.5 text-[11px] font-extrabold text-[#0f3f5c]">
                          Day {dayNum}
                        </span>
                        {duration && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-200/60 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            <Clock className="h-3 w-3 text-slate-500" />
                            {duration}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Attendance Status Pill */}
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-bold ring-1 ring-inset ${statusCfg.badge}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusCfg.label}
                        </span>

                        {/* SPOC Verification Pill */}
                        <span
                          className={`hidden rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize sm:inline-block ${verifCfg.badge}`}
                        >
                          {verifCfg.label}
                        </span>
                      </div>
                    </div>

                    {/* Middle Section: College info & Check-in / Check-out timestamps */}
                    <div className="p-4 sm:p-6">
                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                        {/* Left Info: College & Course */}
                        <div className="space-y-2.5 xl:col-span-4 min-w-0">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0f3f5c]" />
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-bold text-slate-950 break-words">
                                {collegeName}
                              </h4>
                              {collegeLocation && (
                                <p className="text-xs text-slate-500 break-words">
                                  {collegeLocation}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-600 min-w-0">
                            <GraduationCap className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="font-medium text-slate-700 truncate">{courseName}</span>
                          </div>

                          {record.students != null && (
                            <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
                              <Users className="h-4 w-4 shrink-0 text-slate-400" />
                              <span className="truncate">
                                Students:{" "}
                                <strong className="text-slate-800">
                                  {record.studentsPresent ?? 0} Present / {record.studentsAbsent ?? 0} Absent
                                </strong>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Middle & Right: Check-In vs Check-Out Grid */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:col-span-8 min-w-0">
                          {/* Check-In Card */}
                          <div className="flex items-start justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 gap-2 min-w-0">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                                <Clock className="h-3 w-3 shrink-0" />
                                <span>Check-In</span>
                              </div>
                              <div className="text-sm font-bold text-slate-900">
                                {formatTime(record.checkInTime, record.checkIn?.time || record.createdAt)}
                              </div>
                              <div className="text-[11px] text-slate-500 min-w-0">
                                {record.latitude != null || record.checkInLocation?.lat != null ? (
                                  <span className="inline-flex items-center gap-1 font-mono break-words">
                                    <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                                    {formatCoord(record.latitude || record.checkInLocation?.lat)},{" "}
                                    {formatCoord(record.longitude || record.checkInLocation?.lng)}
                                  </span>
                                ) : (
                                  "No GPS coordinates"
                                )}
                              </div>
                            </div>

                            {checkInImg && (
                              <button
                                type="button"
                                onClick={() => setPreviewImage(resolveImageUrl(checkInImg))}
                                className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-200 shadow-sm"
                                title="View Check-In Photo"
                              >
                                <img loading="lazy"
                                  src={resolveImageUrl(checkInImg)}
                                  alt="Check-in GeoTag"
                                  className="h-full w-full object-cover transition group-hover:scale-110"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                                  <Eye className="h-4 w-4 text-white" />
                                </div>
                              </button>
                            )}
                          </div>

                          {/* Check-Out Card */}
                          <div className="flex items-start justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 gap-2 min-w-0">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#1a6b9e]">
                                <Clock className="h-3 w-3 shrink-0" />
                                <span>Check-Out</span>
                              </div>
                              <div className="text-sm font-bold text-slate-900">
                                {formatTime(record.checkOutTime, record.checkOut?.time || record.completedAt)}
                              </div>
                              <div className="text-[11px] text-slate-500 min-w-0">
                                {record.checkOutLatitude != null || record.checkOutLocation?.lat != null ? (
                                  <span className="inline-flex items-center gap-1 font-mono break-words">
                                    <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                                    {formatCoord(record.checkOutLatitude || record.checkOutLocation?.lat)},{" "}
                                    {formatCoord(record.checkOutLongitude || record.checkOutLocation?.lng)}
                                  </span>
                                ) : (
                                  "No GPS coordinates"
                                )}
                              </div>
                            </div>

                            {checkOutImg && (
                              <button
                                type="button"
                                onClick={() => setPreviewImage(resolveImageUrl(checkOutImg))}
                                className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-200 shadow-sm"
                                title="View Check-Out Photo"
                              >
                                <img loading="lazy"
                                  src={resolveImageUrl(checkOutImg)}
                                  alt="Check-out GeoTag"
                                  className="h-full w-full object-cover transition group-hover:scale-110"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                                  <Eye className="h-4 w-4 text-white" />
                                </div>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bottom row: Remarks & Full details button */}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
                        <div className="text-slate-500">
                          {record.remarks ? (
                            <span>
                              <strong className="font-semibold text-slate-700">Remarks:</strong>{" "}
                              {record.remarks}
                            </span>
                          ) : (
                            <span className="italic text-slate-400">No remarks logged</span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedRecord(record)}
                          className="inline-flex items-center gap-1 font-semibold text-[#0f3f5c] hover:text-[#1a6b9e]"
                        >
                          <span>Inspect Full Details</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Modal: Record Full Inspection Drawer / Modal ─────────── */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[24px] border border-slate-200 bg-white p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-950">
                    Session Attendance Breakdown
                  </h3>
                  <span className="rounded-md bg-[#0f3f5c]/10 px-2 py-0.5 text-xs font-bold text-[#0f3f5c]">
                    Day {selectedRecord.dayNumber || 1}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {formatDate(selectedRecord.date || selectedRecord.assignedDate || selectedRecord.createdAt)} •{" "}
                  {selectedRecord.collegeId?.name || "Assigned College"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="mt-4 space-y-4 text-xs sm:text-sm">
              {/* College and Course info */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Session Information
                </h4>
                <div className="mt-2 grid grid-cols-2 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-400">College:</span>{" "}
                    <strong>{selectedRecord.collegeId?.name || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Course:</span>{" "}
                    <strong>
                      {selectedRecord.courseId?.name || selectedRecord.courseId?.title || selectedRecord.scheduleId?.subject || "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Status:</span>{" "}
                    <strong className="capitalize">{selectedRecord.status || selectedRecord.attendanceStatus || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Verification:</span>{" "}
                    <strong className="capitalize">{selectedRecord.verificationStatus || "pending"}</strong>
                  </div>
                </div>
              </div>

              {/* Geo Photos & GPS */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Check-In Details */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-800">Check-In GPS & Photo</span>
                    <span className="font-semibold text-slate-900">
                      {formatTime(selectedRecord.checkInTime, selectedRecord.checkIn?.time || selectedRecord.createdAt)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    <div>
                      Coords:{" "}
                      <span className="font-mono text-slate-700">
                        {selectedRecord.latitude != null || selectedRecord.checkInLocation?.lat != null
                          ? `${formatCoord(selectedRecord.latitude || selectedRecord.checkInLocation?.lat)}, ${formatCoord(selectedRecord.longitude || selectedRecord.checkInLocation?.lng)}`
                          : "—"}
                      </span>
                    </div>
                    {selectedRecord.checkInLocation?.address && (
                      <div className="mt-1 line-clamp-2 text-slate-600">
                        Address: {selectedRecord.checkInLocation.address}
                      </div>
                    )}
                  </div>
                  {(selectedRecord.checkInImage || selectedRecord.imageUrl) && (
                    <div
                      className="cursor-pointer overflow-hidden rounded-lg border border-slate-200"
                      onClick={() => setPreviewImage(resolveImageUrl(selectedRecord.checkInImage || selectedRecord.imageUrl))}
                    >
                      <img loading="lazy"
                        src={resolveImageUrl(selectedRecord.checkInImage || selectedRecord.imageUrl)}
                        alt="Check-In"
                        className="h-32 w-full object-cover transition hover:scale-105"
                      />
                    </div>
                  )}
                </div>

                {/* Check-Out Details */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1a6b9e]">Check-Out GPS & Photo</span>
                    <span className="font-semibold text-slate-900">
                      {formatTime(selectedRecord.checkOutTime, selectedRecord.checkOut?.time || selectedRecord.completedAt)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    <div>
                      Coords:{" "}
                      <span className="font-mono text-slate-700">
                        {selectedRecord.checkOutLatitude != null || selectedRecord.checkOutLocation?.lat != null
                          ? `${formatCoord(selectedRecord.checkOutLatitude || selectedRecord.checkOutLocation?.lat)}, ${formatCoord(selectedRecord.checkOutLongitude || selectedRecord.checkOutLocation?.lng)}`
                          : "—"}
                      </span>
                    </div>
                    {selectedRecord.checkOutLocation?.address && (
                      <div className="mt-1 line-clamp-2 text-slate-600">
                        Address: {selectedRecord.checkOutLocation.address}
                      </div>
                    )}
                  </div>
                  {(selectedRecord.checkOutImage || selectedRecord.checkOutGeoImageUrl) && (
                    <div
                      className="cursor-pointer overflow-hidden rounded-lg border border-slate-200"
                      onClick={() => setPreviewImage(resolveImageUrl(selectedRecord.checkOutImage || selectedRecord.checkOutGeoImageUrl))}
                    >
                      <img loading="lazy"
                        src={resolveImageUrl(selectedRecord.checkOutImage || selectedRecord.checkOutGeoImageUrl)}
                        alt="Check-Out"
                        className="h-32 w-full object-cover transition hover:scale-105"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Student Attendance summary */}
              {selectedRecord.students && Array.isArray(selectedRecord.students) && (
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900">
                      Student Roster ({selectedRecord.students.length} students)
                    </h4>
                    <span className="text-xs font-semibold text-slate-600">
                      {selectedRecord.studentsPresent ?? 0} Present / {selectedRecord.studentsAbsent ?? 0} Absent
                    </span>
                  </div>
                  <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-100 bg-slate-50 p-2">
                    {selectedRecord.students.slice(0, 10).map((st, sIdx) => (
                      <div key={st._id || sIdx} className="flex items-center justify-between py-1 text-xs">
                        <span className="font-medium text-slate-800">{st.name || `Student ${sIdx + 1}`}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            st.status === "Present" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {st.status || "Absent"}
                        </span>
                      </div>
                    ))}
                    {selectedRecord.students.length > 10 && (
                      <div className="pt-1 text-center text-[11px] text-slate-400">
                        + {selectedRecord.students.length - 10} more students
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Uploaded Documents */}
              {(selectedRecord.attendancePdfUrl ||
                selectedRecord.scannedAttendancePdfUrl ||
                selectedRecord.attendanceExcelUrl) && (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {selectedRecord.attendancePdfUrl && (
                    <a
                      href={selectedRecord.attendancePdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <FileText className="h-3.5 w-3.5 text-rose-500" />
                      <span>Attendance PDF</span>
                      <ExternalLink className="h-3 w-3 text-slate-400" />
                    </a>
                  )}
                  {selectedRecord.attendanceExcelUrl && (
                    <a
                      href={selectedRecord.attendanceExcelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Excel Roster</span>
                      <ExternalLink className="h-3 w-3 text-slate-400" />
                    </a>
                  )}
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-end border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Photo Lightbox Preview ───────────────────────── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative flex max-h-[90vh] max-w-4xl items-center justify-center overflow-hidden rounded-2xl bg-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              loading="lazy"
              src={previewImage}
              alt="GeoTag Preview"
              className="max-h-[82vh] max-w-full object-contain rounded-xl"
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute right-3 top-3 rounded-full bg-slate-900/80 p-2 text-white shadow-md transition hover:bg-black hover:scale-105"
              title="Close Preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(TrainerAttendanceHistory);
