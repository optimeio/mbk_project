"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, GraduationCap, Mail, Phone, User } from "lucide-react";

import PortalLoadingState from "@/components/common/PortalLoadingState";
import { usePortalRoleGuard } from "@/hooks/usePortalRoleGuard";
import { studentPortalService } from "@/services/studentPortalService";

const StatCard = ({ label, value, icon: IconComponent }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-3 inline-flex rounded-xl bg-orange-50 p-2.5 text-orange-600">
      <IconComponent className="h-5 w-5" />
    </div>
    <p className="text-sm text-slate-500">{label}</p>
    <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
  </div>
);

export default function StudentDashboard() {
  const { allowed, loading: authLoading } = usePortalRoleGuard("student");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!allowed) return undefined;

    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await studentPortalService.getDashboard();
        if (!cancelled) {
          if (response.success) {
            setProfile(response.student);
          } else {
            setError(response.message || "Failed to load dashboard");
          }
        }
      } catch {
        if (!cancelled) setError("Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  if (authLoading || !allowed) {
    return (
      <PortalLoadingState
        title="Loading student portal"
        description="Verifying your session and profile."
      />
    );
  }

  if (loading) {
    return (
      <PortalLoadingState
        title="Loading dashboard"
        description="Fetching your learning profile."
      />
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-orange-500 to-amber-400 p-6 text-white shadow-lg md:p-8">
        <p className="text-sm font-medium uppercase tracking-wide text-orange-50">Student Portal</p>
        <h1 className="mt-2 text-2xl font-bold md:text-3xl">
          Welcome back, {profile?.fullName || "Student"}
        </h1>
        <p className="mt-2 max-w-2xl text-orange-50">
          Track your course enrollment, explore MBK training programs, and manage your profile.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Enrolled Course" value={profile?.course || "Not set"} icon={BookOpen} />
        <StatCard label="College" value={profile?.college || "Not set"} icon={GraduationCap} />
        <StatCard label="Company Code" value={profile?.companyCode || "Not linked"} icon={User} />
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Profile Summary</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-slate-400" />
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="font-medium text-slate-900">{profile?.email}</dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-slate-400" />
              <div>
                <dt className="text-slate-500">Phone</dt>
                <dd className="font-medium text-slate-900">{profile?.phone || "—"}</dd>
              </div>
            </div>
          </dl>
          <Link
            href="/student/profile"
            className="mt-5 inline-flex text-sm font-semibold text-orange-600 hover:text-orange-700"
          >
            Edit profile →
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
          <div className="mt-4 grid gap-3">
            <Link
              href="/student/courses"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-orange-300 hover:bg-orange-50"
            >
              Browse training courses
            </Link>
            <Link
              href="/lms"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-orange-300 hover:bg-orange-50"
            >
              Open learning hub (LMS)
            </Link>
            <Link
              href="/student/profile"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-orange-300 hover:bg-orange-50"
            >
              Update contact details
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
