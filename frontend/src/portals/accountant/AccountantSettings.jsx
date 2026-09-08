"use client";

import { useState } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";
import { notify } from "@/lib/toast";
import { Shield, LogOut, Save, Eye, EyeOff } from "lucide-react";

const Section = ({ title, children }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
    <div className="px-6 py-4 border-b bg-gray-50/50">
      <h2 className="font-semibold text-gray-900">{title}</h2>
    </div>
    <div className="px-6 py-5">{children}</div>
  </div>
);

const Field = ({ label, children }) => (
  <div className="grid grid-cols-3 gap-4 items-start py-3 border-b border-gray-50 last:border-0">
    <label className="text-sm font-medium text-gray-600 pt-2">{label}</label>
    <div className="col-span-2">{children}</div>
  </div>
);

export default function AccountantSettings() {
  const router = useRouter();
  const { currentUser, logout } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [notifications, setNotifications] = useState({
    salaryApproval: true,
    payslipGenerated: true,
    weeklyReport: false,
    emailAlerts: true,
  });

  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      await api.put("/users/notification-preferences", { preferences: notifications });
      notify.success("Notification preferences saved");
    } catch {
      notify.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      notify.error("New passwords do not match");
      return;
    }
    if (passwordForm.new.length < 8) {
      notify.error("Password must be at least 8 characters");
      return;
    }
    setSavingPwd(true);
    try {
      await api.put("/auth/change-password", {
        currentPassword: passwordForm.current,
        newPassword: passwordForm.new,
      });
      notify.success("Password updated successfully");
      setPasswordForm({ current: "", new: "", confirm: "" });
    } catch (err) {
      notify.error(err?.message || "Failed to update password");
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account preferences</p>
      </div>

      {/* Profile Info */}
      <Section title="Account Information">
        <Field label="Name">
          <p className="text-sm text-gray-900 py-2">{currentUser?.name || "—"}</p>
        </Field>
        <Field label="Email">
          <p className="text-sm text-gray-900 py-2">{currentUser?.email || "—"}</p>
        </Field>
        <Field label="Role">
          <span className="inline-flex px-2.5 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full">
            Accountant
          </span>
        </Field>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        {Object.entries(notifications).map(([key, value]) => {
          const labels = {
            salaryApproval: "Salary approval requests",
            payslipGenerated: "Payslip generation complete",
            weeklyReport: "Weekly financial summary",
            emailAlerts: "Email alerts",
          };
          return (
            <div key={key} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-700">{labels[key]}</span>
              <button
                onClick={() => setNotifications((prev) => ({ ...prev, [key]: !value }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? "bg-indigo-600" : "bg-gray-200"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${value ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          );
        })}
        <div className="flex justify-end mt-4">
          <button onClick={handleSaveNotifications} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50">
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save preferences"}
          </button>
        </div>
      </Section>

      {/* Security */}
      <Section title="Security">
        <form onSubmit={handlePasswordChange} className="space-y-4">
          {[
            { label: "Current password", key: "current" },
            { label: "New password", key: "new" },
            { label: "Confirm new password", key: "confirm" },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordForm[key]}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, [key]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 pr-10"
                  required
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
          <button type="submit" disabled={savingPwd}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50">
            <Shield className="w-4 h-4" />
            {savingPwd ? "Updating…" : "Update password"}
          </button>
        </form>
      </Section>

      {/* Danger Zone */}
      <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
        <h3 className="font-semibold text-red-900 mb-1">Sign Out</h3>
        <p className="text-sm text-red-700 mb-3">You will be logged out and returned to the home page.</p>
        <button onClick={async () => {
            try {
              await logout();
              router.push('/');
            } catch (error) {
              console.error('Logout failed:', error);
              router.push('/');
            }
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700">
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
