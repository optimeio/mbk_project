"use client";

import { memo } from "react";
import Link from "next/link";
import { ClipboardCheck, ArrowRight, Calendar } from "lucide-react";
import TrainerAttendanceHistory from "./attendance/TrainerAttendanceHistory";

function TrainerAttendancePage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-3 py-2 sm:px-6 lg:px-8">
      {/* ── Page Header ─────────────────────────────────────── */}
      <section className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:rounded-[28px] sm:px-8 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0f3f5c] to-[#1a6b9e] text-white shadow-md">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#0f3f5c]">
                TRAINER PORTAL
              </div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
                My Attendance History
              </h1>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                Track your attendance status, geo-verified check-in/out timestamps, and SPOC approvals.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── Attendance History Hub ───────────────────────────── */}
      <TrainerAttendanceHistory />
    </div>
  );
}

export default memo(TrainerAttendancePage);
