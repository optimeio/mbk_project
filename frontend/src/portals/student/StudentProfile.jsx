"use client";

import { useEffect, useState } from "react";

import PortalLoadingState from "@/components/common/PortalLoadingState";
import { usePortalRoleGuard } from "@/hooks/usePortalRoleGuard";
import { studentPortalService } from "@/services/studentPortalService";
import { useAuth } from "@/context/AuthContext";
import CTAButton from "@/components/common/CTAButton";

const COURSE_OPTIONS = [
  { value: "pcb", label: "PCB" },
  { value: "iot", label: "IoT" },
  { value: "employability", label: "Employability" },
  { value: "surface modelling", label: "Surface Modelling" },
  { value: "solid works", label: "Solid Works" },
];

export default function StudentProfile() {
  const { allowed, loading: authLoading } = usePortalRoleGuard("student");
  const { setAuthUser, user } = useAuth();
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    college: "",
    course: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!allowed) return undefined;

    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const response = await studentPortalService.getDashboard();
        if (!cancelled && response.success) {
          const profile = response.student;
          setForm({
            fullName: profile.fullName || "",
            phone: profile.phone || "",
            college: profile.college || "",
            course: profile.course || "",
          });
        }
      } catch {
        if (!cancelled) setError("Failed to load profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await studentPortalService.updateProfile(form);
      if (response.success) {
        setMessage("Profile updated successfully.");
        if (response.student) {
          setAuthUser({ ...user, ...response.student, role: "student" });
        }
      } else {
        setError(response.message || "Failed to update profile.");
      }
    } catch {
      setError("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !allowed) {
    return <PortalLoadingState title="Loading profile" description="Verifying student access." />;
  }

  if (loading) {
    return <PortalLoadingState title="Loading profile" description="Fetching your details." />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="mt-1 text-slate-600">Update your contact and academic information.</p>
      </div>

      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Full Name</span>
          <input
            required
            value={form.fullName}
            onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-orange-400"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Phone</span>
          <input
            required
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-orange-400"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">College / Institute</span>
          <input
            required
            value={form.college}
            onChange={(e) => setForm((prev) => ({ ...prev, college: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-orange-400"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Course</span>
          <select
            required
            value={form.course}
            onChange={(e) => setForm((prev) => ({ ...prev, course: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-orange-400"
          >
            <option value="">Select course</option>
            {COURSE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <CTAButton
          type="submit"
          variant="brand"
          size="lg"
          fullWidth
          loading={saving}
          loadingText="Saving..."
          className="rounded-xl"
        >
          Save Changes
        </CTAButton>
      </form>
    </div>
  );
}
