"use client";

import { memo, useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";

/* ─── helpers ───────────────────────────────────────────────── */
const formatCoord = (val) =>
  typeof val === "number" ? val.toFixed(5) : "—";

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString(undefined, {
      dateStyle: "medium",
    });
  } catch {
    return dateStr;
  }
};

const resolveImageUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  
  // Try to use NEXT_PUBLIC_API_URL
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/api$/, "");
  
  // Ensure the path has /uploads/ prefix if it's just a filename
  let processedPath = path;
  if (!processedPath.startsWith("/") && !processedPath.startsWith("uploads/")) {
    processedPath = `/uploads/${processedPath}`;
  } else if (processedPath.startsWith("uploads/")) {
    processedPath = `/${processedPath}`;
  } else if (processedPath.startsWith("/") && !processedPath.startsWith("/uploads/")) {
    // It's an absolute path but might not have uploads
    // Assuming all local images should be from /uploads/
    processedPath = `/uploads${processedPath}`;
  }

  if (apiBase) {
    return `${apiBase}${processedPath}`;
  }
  
  return processedPath;
};

const STATUS_STYLE = {
  Present: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Absent:  "bg-rose-100 text-rose-800 border-rose-200",
  pending: "bg-amber-100 text-amber-800 border-amber-200",
};

/* ─── component ─────────────────────────────────────────────── */
function TrainerAttendanceHistory() {
  const { currentUser } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const trainerId =
    currentUser?.trainerId ||
    currentUser?.trainer_id ||
    currentUser?.id ||
    currentUser?._id;

  const fetchHistory = useCallback(async () => {
    if (!trainerId) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/attendance/trainer/${trainerId}`);
      const data = res?.data || res || [];
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load attendance history.",
      );
    } finally {
      setLoading(false);
    }
  }, [trainerId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  /* ── render ─────────────────────────────────────────────────── */
  return (
    <section
      id="attendance-history-section"
      className="rounded-[24px] border border-slate-200 bg-white shadow-sm sm:rounded-[28px] overflow-hidden"
    >
      {/* header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-[#0f3f5c] to-[#1a6b9e] px-5 py-4 sm:px-7 sm:py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <CalendarDays className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white sm:text-lg">
              Attendance History
            </h2>
            <p className="text-xs text-blue-100 sm:text-sm">
              Your recent attendance records
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchHistory}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </button>
      </div>

      <div className="px-5 py-5 sm:px-7 sm:py-6">
        {/* loading */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#1a6b9e]" />
            Loading attendance records…
          </div>
        )}

        {/* error */}
        {!loading && error && (
          <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        {/* empty */}
        {!loading && !error && records.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Clock3 className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-500">
              No attendance records found.
            </p>
            <p className="text-xs text-slate-400">
              Submit your first attendance using the form above.
            </p>
          </div>
        )}

        {/* list */}
        {!loading && !error && records.length > 0 && (
          <div className="space-y-4">
            {records.map((record, idx) => {
              const status = record.attendanceStatus || record.status || "pending";
              const statusStyle = STATUS_STYLE[status] || STATUS_STYLE.pending;

              return (
                <div
                  key={record._id || record.id || idx}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  {/* Card Header: Date & Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">
                        {formatDate(record.date || record.assignedDate || record.createdAt)}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusStyle}`}
                      >
                        {status === "Present" ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : status === "Absent" ? (
                          <XCircle className="h-3 w-3" />
                        ) : (
                          <Clock3 className="h-3 w-3" />
                        )}
                        {status}
                      </span>
                    </div>
                    {record.verificationStatus && (
                      <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 capitalize">
                        Verification: {record.verificationStatus}
                      </span>
                    )}
                  </div>

                  {/* Card Body: Check-In vs Check-Out Grid */}
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {/* Check-In Column */}
                    <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#0f3f5c]">Check-In Details</h4>
                        <div className="mt-2 space-y-1.5 text-xs text-slate-600">
                          <div>
                            <span className="font-semibold text-slate-500">Time:</span>{" "}
                            <span className="font-medium text-slate-950">{record.checkInTime || "—"}</span>
                          </div>
                          {/* Coordinates */}
                          <div>
                            <span className="font-semibold text-slate-500">Location:</span>{" "}
                            <span className="font-mono text-slate-800">
                              {record.latitude != null || record.longitude != null 
                                ? `${formatCoord(record.latitude)}, ${formatCoord(record.longitude)}`
                                : record.checkInLocation?.lat != null 
                                  ? `${formatCoord(record.checkInLocation.lat)}, ${formatCoord(record.checkInLocation.lng)}`
                                  : "—"}
                            </span>
                          </div>
                          {/* Address */}
                          {(record.checkInLocation?.address || record.checkIn?.location?.address) && (
                            <div className="flex items-start gap-1">
                              <span className="font-semibold text-slate-500 shrink-0">Address:</span>
                              <span className="text-slate-800 line-clamp-2">
                                {record.checkInLocation?.address || record.checkIn?.location?.address}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Check-In Image */}
                      {(record.checkInImage || record.imageUrl) && (
                        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
                          <img loading="lazy"
                            src={resolveImageUrl(record.checkInImage || record.imageUrl)}
                            alt="Check-In GeoTag"
                            className="h-28 w-full object-cover transition hover:scale-105"
                          />
                        </div>
                      )}
                    </div>

                    {/* Check-Out Column */}
                    <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#1a6b9e]">Check-Out Details</h4>
                        <div className="mt-2 space-y-1.5 text-xs text-slate-600">
                          <div>
                            <span className="font-semibold text-slate-500">Time:</span>{" "}
                            <span className="font-medium text-slate-950">{record.checkOutTime || "—"}</span>
                          </div>
                          {/* Coordinates */}
                          <div>
                            <span className="font-semibold text-slate-500">Location:</span>{" "}
                            <span className="font-mono text-slate-800">
                              {record.checkOutLatitude != null || record.checkOutLongitude != null 
                                ? `${formatCoord(record.checkOutLatitude)}, ${formatCoord(record.checkOutLongitude)}`
                                : record.checkOutLocation?.lat != null 
                                  ? `${formatCoord(record.checkOutLocation.lat)}, ${formatCoord(record.checkOutLocation.lng)}`
                                  : "—"}
                            </span>
                          </div>
                          {/* Address */}
                          {(record.checkOutLocation?.address || record.checkOut?.location?.address) && (
                            <div className="flex items-start gap-1">
                              <span className="font-semibold text-slate-500 shrink-0">Address:</span>
                              <span className="text-slate-800 line-clamp-2">
                                {record.checkOutLocation?.address || record.checkOut?.location?.address}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Check-Out Image */}
                      {(record.checkOutImage || record.checkOutGeoImageUrl) && (
                        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
                          <img loading="lazy"
                            src={resolveImageUrl(record.checkOutImage || record.checkOutGeoImageUrl)}
                            alt="Check-Out GeoTag"
                            className="h-28 w-full object-cover transition hover:scale-105"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {record.remarks && (
                    <div className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-500 italic">
                      Remarks: {record.remarks}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default memo(TrainerAttendanceHistory);
