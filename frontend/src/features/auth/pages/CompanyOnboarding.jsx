"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import api from "@/services/api";
import CTAButton from "@/components/common/CTAButton";

export default function CompanyOnboarding() {
  const { token } = useParams();
  const [valid, setValid] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  const logoPreviewUrlRef = useRef("");
  const [form, setForm] = useState({
    companyName: "",
    adminName: "",
    phone: "",
    address: "",
    logo: null,
  });

  useEffect(() => {
    const validate = async () => {
      try {
        const res = await api.get(`/company-invite/validate/${token}`);
        if (res?.success) {
          setValid(true);
          setInviteEmail(res?.email || "");
        } else {
          setValid(false);
        }
      } catch (e) {
        setValid(false);
      } finally {
        setLoading(false);
      }
    };
    validate();
  }, [token]);

  useEffect(() => () => {
    if (logoPreviewUrlRef.current) {
      URL.revokeObjectURL(logoPreviewUrlRef.current);
      logoPreviewUrlRef.current = "";
    }
  }, []);

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (!form.companyName || !form.adminName || !form.phone || !form.address) {
      setError("Please fill all required fields.");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("companyName", form.companyName);
      formData.append("adminName", form.adminName);
      formData.append("phone", form.phone);
      formData.append("address", form.address);
      if (form.logo) formData.append("logo", form.logo);
      formData.append("token", token);

      const response = await api.post("/company-invite/complete", formData);
      const warning = String(response?.warning || "").trim();
      setSuccess(
        warning
          ? `Company created successfully. ${warning}`
          : "Company Created Successfully",
      );
    } catch (e) {
      setError(e.message || "Failed to create company.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, logo: file }));

    if (logoPreviewUrlRef.current) {
      URL.revokeObjectURL(logoPreviewUrlRef.current);
      logoPreviewUrlRef.current = "";
    }

    if (!file) {
      setLogoPreview("");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file for logo.");
      setLogoPreview("");
      return;
    }
    setError("");
    const nextPreviewUrl = URL.createObjectURL(file);
    logoPreviewUrlRef.current = nextPreviewUrl;
    setLogoPreview(nextPreviewUrl);
  };

  const isLocked = submitting || Boolean(success);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 p-6">
        <div className="max-w-2xl mx-auto mt-10 bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
          <h2 className="text-xl font-semibold text-slate-800">Validating invite link...</h2>
        </div>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 p-6">
        <div className="max-w-xl mx-auto mt-10 bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center">
          <h2 className="text-2xl font-semibold text-slate-900">Invalid or Expired Link</h2>
          <p className="text-sm text-slate-600 mt-2">
            This onboarding invite is not valid anymore. Please request a new invite from MBK Super Admin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 p-6">
      <div className="max-w-2xl mx-auto mt-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <div className="mb-6">
          <p className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            MBK Invite Onboarding
          </p>
          <h2 className="text-3xl font-semibold text-slate-900 mt-3">Complete Company Setup</h2>
          <p className="text-sm text-slate-600 mt-2">
            Fill the details below to activate your company profile.
          </p>
        </div>

        <div className="mb-5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Invitation Email</p>
          <p className="text-sm text-slate-800 mt-1">{inviteEmail || "N/A"}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Company Logo</label>
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-slate-400">Preview</span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                className="block w-full border border-slate-300 rounded-lg p-2 text-sm text-slate-700"
                onChange={handleLogoChange}
                disabled={isLocked}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
            <input
              placeholder="Enter company name"
              className="w-full border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              disabled={isLocked}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Admin Name</label>
            <input
              placeholder="Enter admin name"
              className="w-full border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50"
              value={form.adminName}
              onChange={(e) => setForm({ ...form, adminName: e.target.value })}
              disabled={isLocked}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
            <input
              placeholder="Enter contact number"
              className="w-full border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              disabled={isLocked}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <textarea
              placeholder="Enter full company address"
              rows={4}
              className="w-full border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              disabled={isLocked}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {success}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <CTAButton
              type="button"
              variant="company"
              size="lg"
              onClick={handleSubmit}
              disabled={isLocked}
              loading={submitting}
              loadingText="Creating..."
            >
              {success ? "Company Created" : "Create Company"}
            </CTAButton>
          </div>
        </div>
      </div>
    </div>
  );
}
