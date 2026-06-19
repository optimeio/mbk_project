"use client";

import { useState } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/AuthContext";
import { notify } from "@/lib/toast";
import { LogOut, Save } from "lucide-react";

const Section = ({ title, desc, children }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
    <div className="px-6 py-4 border-b bg-gray-50/50">
      <h2 className="font-semibold text-gray-900">{title}</h2>
      {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
    </div>
    <div className="px-6 py-5">{children}</div>
  </div>
);

export default function SpocSettings() {
  const router = useRouter();
  const { currentUser, logout } = useAuth();
  const [notifications, setNotifications] = useState({
    newCheckIn: true,
    geoVerification: true,
    scheduleChanges: true,
    emailAlerts: true,
  });
  const [savingNotif, setSavingNotif] = useState(false);

  const handleSaveNotifications = async () => {
    setSavingNotif(true);
    await new Promise((r) => setTimeout(r, 500));
    notify.success("Notification preferences saved");
    setSavingNotif(false);
  };

  const notifLabels = {
    newCheckIn: "New trainer check-in alerts",
    geoVerification: "Geo verification requests",
    scheduleChanges: "Schedule change notifications",
    emailAlerts: "Daily email digest",
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your SPOC account preferences</p>
      </div>

      {/* Profile */}
      <Section title="Account Information">
        <div className="space-y-4">
          {[
            { label: "Name", value: currentUser?.name },
            { label: "Email", value: currentUser?.email },
            { label: "College", value: currentUser?.college?.name || currentUser?.collegeName },
            { label: "Role", value: currentUser?.role },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-4 py-2 border-b border-gray-50 last:border-0">
              <span className="text-sm font-medium text-gray-500 w-28 shrink-0">{label}</span>
              <span className="text-sm text-gray-900">{value || "—"}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications" desc="Configure what alerts you receive">
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
          <button onClick={handleSaveNotifications} disabled={savingNotif}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50">
            <Save className="w-4 h-4" />
            {savingNotif ? "Saving…" : "Save preferences"}
          </button>
        </div>
      </Section>

      {/* Sign out */}
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
