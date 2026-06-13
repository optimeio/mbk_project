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
      timeStyle: "short",
    });
  } catch {
    return dateStr;
  }
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
          <div className="space-y-3">
            {records.map((record, idx) => {
              const status = record.attendanceStatus || record.status || "pending";
              const statusStyle = STATUS_STYLE[status] || STATUS_STYLE.pending;
              const hasLocation =
                record.latitude != null || record.longitude != null;

              return (
                <div
                  key={record._id || record.id || idx}
                  className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 transition hover:border-slate-200 hover:bg-white sm:px-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    {/* date + badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800">
                        {formatDate(
                          record.assignedDate ||
                            record.capturedAt ||
                            record.createdAt,
                        )}
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

                    {/* verification badge */}
                    {record.verificationStatus && (
                      <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 capitalize">
                        {record.verificationStatus}
                      </span>
                    )}
                  </div>

                  {/* location row */}
                  {hasLocation && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="font-mono">
                        {formatCoord(record.latitude)},{" "}
                        {formatCoord(record.longitude)}
                      </span>
                      {record.accuracy != null && (
                        <span className="text-slate-400">
                          ±{Math.round(record.accuracy)} m
                        </span>
                      )}
                    </div>
                  )}

                  {/* attendance image */}
                  {record.imageUrl && (
                    <div className="mt-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={record.imageUrl}
                        alt="Attendance"
                        className="h-28 w-full rounded-xl object-cover border border-slate-200 sm:h-36"
                      />
                    </div>
                  )}

                  {/* note */}
                  {record.notes && (
                    <p className="mt-2 text-xs text-slate-500 italic">
                      {record.notes}
                    </p>
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
