"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";
import { notify } from "@/lib/toast";
import { Bell, Shield, LogOut, Save, Eye, EyeOff } from "lucide-react";

const Section = ({ title, children }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
    <div className="px-5 py-4 border-b bg-gray-50/50">
      <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
    </div>
    <div className="px-5 py-5">{children}</div>
  </div>
);

export default function TrainerSettings() {
  const { currentUser, logout } = useAuth();
  const [showPwd, setShowPwd] = useState(false);
  const [notifications, setNotifications] = useState({
    scheduleUpdates: true,
    payslipReady: true,
    attendanceApproved: true,
    complaintUpdates: true,
    chatMessages: true,
  });

  const notifLabels = {
    scheduleUpdates: "Schedule changes & new assignments",
    payslipReady: "Payslip generated notification",
    attendanceApproved: "Attendance verification updates",
    complaintUpdates: "Complaint status changes",
    chatMessages: "New chat messages",
  };

  const [savingNotif, setSavingNotif] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });
  const [savingPwd, setSavingPwd] = useState(false);

  const handleSave = async () => {
    setSavingNotif(true);
    try {
      await api.put("/users/notification-preferences", { preferences: notifications });
      notify.success("Preferences saved");
    } catch {
      notify.error("Failed to save preferences");
    } finally {
      setSavingNotif(false);
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
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Account preferences and security</p>
      </div>

      {/* Profile overview */}
      <Section title="Your Account">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xl font-bold shrink-0">
            {(currentUser?.name || "T")[0]}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{currentUser?.name || "—"}</p>
            <p className="text-sm text-gray-400">{currentUser?.email}</p>
            <span className="inline-flex mt-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full">
              Trainer
            </span>
          </div>
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <div className="space-y-1">
          {Object.entries(notifications).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-700">{notifLabels[key]}</span>
              <button
                onClick={() => setNotifications((p) => ({ ...p, [key]: !val }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${val ? "bg-indigo-600" : "bg-gray-200"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${val ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={handleSave} disabled={savingNotif}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50">
            <Save className="w-4 h-4" />
            {savingNotif ? "Saving…" : "Save"}
          </button>
        </div>
      </Section>

      {/* Security / Password Change */}
      <Section title="Security">
        <form onSubmit={handlePasswordChange} className="space-y-4">
          {[
            { label: "Current password", key: "current" },
            { label: "New password", key: "new" },
            { label: "Confirm new password", key: "confirm" },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={passwordForm[key]}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, [key]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 pr-10"
                  required
                />
                <button type="button" onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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

      {/* Sign out */}
      <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
        <h3 className="font-semibold text-red-900 mb-1">Sign Out</h3>
        <p className="text-sm text-red-700 mb-3">You will be logged out of the trainer portal.</p>
        <button onClick={logout}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700">
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
