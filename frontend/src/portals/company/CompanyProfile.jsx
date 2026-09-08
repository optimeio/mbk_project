"use client";

import { useEffect, useState } from "react";

import PortalLoadingState from "@/components/common/PortalLoadingState";
import { usePortalRoleGuard } from "@/hooks/usePortalRoleGuard";
import { companyPortalService } from "@/services/companyPortalService";
import { useAuth } from "@/context/AuthContext";
import CTAButton from "@/components/common/CTAButton";

export default function CompanyProfile() {
  const { allowed, loading: authLoading } = usePortalRoleGuard("company");
  const { setAuthUser, user } = useAuth();
  const [form, setForm] = useState({
    adminName: "",
    phone: "",
    address: "",
    website: "",
  });
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [companyCode, setCompanyCode] = useState("");
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
        const response = await companyPortalService.getProfile();
        if (!cancelled && response.success) {
          const company = response.company;
          setCompanyName(company.name || "");
          setEmail(company.email || "");
          setCompanyCode(company.companyCode || "");
          setForm({
            adminName: company.adminName || "",
            phone: company.phone || "",
            address: company.address || "",
            website: company.website || "",
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
      const response = await companyPortalService.updateProfile(form);
      if (response.success) {
        setMessage("Profile updated successfully.");
        if (response.company) {
          setAuthUser({ ...user, ...response.company, role: "company" });
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
    return <PortalLoadingState title="Loading profile" description="Verifying company access." />;
  }

  if (loading) {
    return <PortalLoadingState title="Loading profile" description="Fetching company details." />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Company Profile</h1>
        <p className="mt-1 text-slate-600">Manage your company contact and admin details.</p>
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
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">Company Name</span>
            <input
              disabled
              value={companyName}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-500"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Company Code</span>
            <input
              disabled
              value={companyCode}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-500"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Email</span>
            <input
              disabled
              value={email}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-500"
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Admin Name</span>
          <input
            required
            value={form.adminName}
            onChange={(e) => setForm((prev) => ({ ...prev, adminName: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-400"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Phone</span>
          <input
            required
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-400"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Address</span>
          <textarea
            value={form.address}
            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            rows={3}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-400"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Website</span>
          <input
            value={form.website}
            onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-400"
            placeholder="https://"
          />
        </label>

        <CTAButton
          type="submit"
          variant="company"
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
