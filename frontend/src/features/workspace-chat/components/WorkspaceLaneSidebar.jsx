"use client";

import { BellRing } from "lucide-react";
import { TABS } from "../constants";

const WorkspaceLaneSidebar = ({ activeTab, onSelectTab }) => (
  <section className="rounded-[28px] border border-white/70 bg-white/95 p-5 shadow-[0_20px_45px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950/90">
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#153E53] text-white">
        <BellRing className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-base font-bold text-slate-950 dark:text-slate-50">Messaging lanes</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Switch between private chats, trainer groups, and announcement streams.
        </p>
      </div>
    </div>

    <div className="mt-4 space-y-3">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelectTab(tab.id)}
          className={`flex w-full items-start gap-3 rounded-[24px] px-4 py-4 text-left transition ${
            activeTab === tab.id
              ? "bg-[#153E53] text-white shadow-[0_16px_32px_rgba(21,62,83,0.2)]"
              : "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          }`}
        >
          <div
            className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl ${
              activeTab === tab.id
                ? "bg-white/12"
                : "bg-white text-[#153E53] dark:bg-slate-800 dark:text-slate-100"
            }`}
          >
            <tab.icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{tab.label}</p>
            <p className={`mt-1 text-xs leading-5 ${activeTab === tab.id ? "text-white/70" : "text-slate-500 dark:text-slate-400"}`}>
              {tab.description}
            </p>
          </div>
        </button>
      ))}
    </div>
  </section>
);

export default WorkspaceLaneSidebar;
