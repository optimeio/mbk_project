"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  MapPin,
  Building2,
  GraduationCap,
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Loader2,
} from "lucide-react";
import dayjs from "dayjs";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";

export default function TrainerUpcomingSchedule() {
  const { currentUser } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  const trainerId =
    currentUser?.trainerProfileId ||
    currentUser?.trainerId ||
    currentUser?.trainer_id ||
    currentUser?.id ||
    currentUser?._id;

  const fetchSchedules = useCallback(async () => {
    if (!trainerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/schedules/trainer/${trainerId}`);
      const rawList = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.schedules)
        ? res.schedules
        : [];

      setSchedules(rawList);
    } catch (err) {
      console.error("Error fetching trainer schedules:", err);
      setError(
        err?.response?.data?.message || err?.message || "Failed to load upcoming schedules."
      );
    } finally {
      setLoading(false);
    }
  }, [trainerId]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Filter for upcoming (today & future) schedules
  const upcomingList = useMemo(() => {
    const todayYMD = dayjs().format("YYYY-MM-DD");

    const filtered = schedules.filter((s) => {
      const sDate = s.scheduledDate || s.date;
      if (!sDate) return false;
      const sYMD = dayjs(sDate).format("YYYY-MM-DD");

      // Keep today and future schedules
      if (sYMD < todayYMD) return false;

      // Month filter
      if (monthFilter) {
        const sMonth = dayjs(sDate).format("YYYY-MM");
        if (sMonth !== monthFilter) return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const collegeName = String(s.collegeId?.name || s.collegeName || "").toLowerCase();
        const courseName = String(
          s.courseId?.name || s.courseId?.title || s.courseName || s.subject || ""
        ).toLowerCase();
        const venue = String(s.venue || s.collegeLocation?.address || "").toLowerCase();
        const dateStr = dayjs(sDate).format("DD MMM YYYY").toLowerCase();

        return (
          collegeName.includes(q) ||
          courseName.includes(q) ||
          venue.includes(q) ||
          dateStr.includes(q)
        );
      }

      return true;
    });

    return filtered.sort((a, b) => {
      const dA = dayjs(a.scheduledDate || a.date).valueOf();
      const dB = dayjs(b.scheduledDate || b.date).valueOf();
      return dA - dB;
    });
  }, [schedules, monthFilter, searchTerm]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-3 py-4 sm:px-6 lg:px-8">
      {/* ── Page Header ─────────────────────────────────────── */}
      <section className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:rounded-[28px] sm:px-8 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0f3f5c] to-[#1a6b9e] text-white shadow-md">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#0f3f5c]">
                TRAINER PORTAL
              </div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
                Upcoming Schedule
              </h1>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                View your upcoming training sessions, assigned colleges, courses, and timetables.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchSchedules}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Schedule</span>
          </button>
        </div>
      </section>

      {/* ── Search & Filter Bar ───────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search college, course, or date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 transition focus:border-[#0f3f5c] focus:outline-none focus:ring-1 focus:ring-[#0f3f5c] sm:text-sm"
            />
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition focus:border-[#0f3f5c] focus:outline-none focus:ring-1 focus:ring-[#0f3f5c] sm:text-sm"
            />
          </div>
        </div>
      </section>

      {/* ── Content Grid ────────────────────────────────────────── */}
      <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-sm text-slate-500">
            <Loader2 className="h-7 w-7 animate-spin text-[#0f3f5c]" />
            <p className="font-medium text-slate-700">Fetching your upcoming training schedule…</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-rose-800">Failed to load schedule</h4>
              <p className="mt-0.5 text-xs text-rose-700">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && upcomingList.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <CalendarDays className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">No upcoming sessions assigned</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">
                You don't have any upcoming classes scheduled for the selected filter.
              </p>
            </div>
          </div>
        )}

        {!loading && !error && upcomingList.length > 0 && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {upcomingList.map((sched) => {
              const schedDate = sched.scheduledDate || sched.date;
              const formattedDate = dayjs(schedDate).format("DD MMM YYYY (ddd)");
              const isToday = dayjs(schedDate).format("YYYY-MM-DD") === dayjs().format("YYYY-MM-DD");
              const collegeName = sched.collegeId?.name || sched.collegeName || "Assigned College";
              const courseName = sched.courseId?.title || sched.courseId?.name || sched.courseName || sched.subject || "Course";
              const sessionLabel = String(sched.session || "FULL_DAY").toUpperCase();

              return (
                <div
                  key={sched._id || sched.id}
                  className={`overflow-hidden rounded-2xl border transition ${
                    isToday
                      ? "border-blue-300 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 ring-1 ring-blue-400/30"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  } p-5 shadow-sm space-y-4`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isToday && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-sm">
                            <Sparkles className="h-3 w-3" /> Today's Class
                          </span>
                        )}
                        <span className="inline-flex items-center rounded-md bg-[#0f3f5c]/10 px-2.5 py-0.5 text-xs font-bold text-[#0f3f5c]">
                          Day {sched.dayNumber || 1}
                        </span>
                        <span className="inline-flex items-center rounded-md bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                          {sessionLabel}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 break-words mt-1">
                        {collegeName}
                      </h3>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 font-bold text-xs text-slate-700">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {formattedDate}
                      </div>
                      <div className="text-[11px] font-semibold text-indigo-700 mt-1">
                        {sched.startTime || "09:00 AM"} - {sched.endTime || "05:00 PM"}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800 truncate">{courseName}</span>
                    </div>
                    {sched.venue || sched.collegeLocation?.address ? (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="truncate">{sched.venue || sched.collegeLocation?.address}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 italic">
                      {isToday ? "Active session — click to start workflow" : "Upcoming session"}
                    </span>

                    {isToday ? (
                      <Link
                        href="/trainer/activities"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f3f5c] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#1a6b9e] transition active:scale-95"
                      >
                        <span>Start Clock-In / Workflow</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <Link
                        href="/trainer/attendance"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#0f3f5c] hover:underline"
                      >
                        <span>View Attendance Status</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
