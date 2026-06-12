"use client";

import {
  LoaderCircle,
  Lock,
  MessagesSquare,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";

const WorkspaceQuickActionsPanel = ({
  busyAction,
  directContacts,
  directPortalUserId,
  enabled,
  groupCandidates,
  groupDescription,
  groupName,
  groupPortalUserIds,
  onCreateDirect,
  onCreateGroup,
  onToggleGroupUser,
  permissions,
  setDirectPortalUserId,
  setGroupDescription,
  setGroupName,
  setShowDirectForm,
  setShowGroupForm,
  showDirectForm,
  showGroupForm,
}) => (
  <section className="rounded-[28px] border border-white/70 bg-white/95 p-5 shadow-[0_20px_45px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950/90">
    <div className="flex items-center gap-2 text-base font-bold text-slate-950 dark:text-slate-50">
      <ShieldCheck className="h-5 w-5 text-[#153E53] dark:text-slate-200" />
      Quick actions
    </div>

    <div className="mt-4 space-y-3">
      <button
        type="button"
        disabled={!permissions.canStartDirectChat || !enabled}
        onClick={() => setShowDirectForm((value) => !value)}
        className="flex w-full items-center justify-between rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Start private chat
        <Plus className="h-4 w-4" />
      </button>

      {showDirectForm ? (
        <form className="space-y-3 rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900" onSubmit={onCreateDirect}>
          <select
            value={directPortalUserId}
            onChange={(event) => setDirectPortalUserId(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="">Choose a SPOC or trainer contact</option>
            {directContacts.map((contact) => (
              <option key={contact.portalUserId} value={contact.portalUserId}>
                {contact.name} - {contact.roleLabel}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!directPortalUserId || busyAction === "direct"}
            className="inline-flex items-center gap-2 rounded-full bg-[#153E53] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f2f3a] disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
          >
            {busyAction === "direct" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MessagesSquare className="h-4 w-4" />}
            Create private chat
          </button>
        </form>
      ) : null}

      <button
        type="button"
        disabled={!permissions.canCreateGroup || !enabled}
        onClick={() => setShowGroupForm((value) => !value)}
        className="flex w-full items-center justify-between rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Create trainer group
        <Plus className="h-4 w-4" />
      </button>

      {showGroupForm ? (
        <form className="space-y-3 rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900" onSubmit={onCreateGroup}>
          <input
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            placeholder="Group name"
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          <textarea
            value={groupDescription}
            onChange={(event) => setGroupDescription(event.target.value)}
            placeholder="Group purpose"
            rows={2}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
            {groupCandidates.map((candidate) => (
              <label key={candidate.portalUserId} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={groupPortalUserIds.includes(candidate.portalUserId)}
                  onChange={() => onToggleGroupUser(candidate.portalUserId)}
                  className="mt-1"
                />
                <span>{candidate.name} - {candidate.roleLabel}</span>
              </label>
            ))}
          </div>
          <button
            type="submit"
            disabled={!groupName.trim() || busyAction === "group"}
            className="inline-flex items-center gap-2 rounded-full bg-[#153E53] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f2f3a] disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
          >
            {busyAction === "group" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
            Create trainer group
          </button>
        </form>
      ) : null}

      <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
          <Lock className="h-4 w-4 text-[#153E53] dark:text-slate-200" />
          Permission rules
        </div>
        <div className="mt-3 space-y-2 text-xs leading-5">
          <p>Trainer can only open private chats with SPOC Admin or Super Admin.</p>
          <p>SPOC Admin can message trainers directly and create trainer groups.</p>
          <p>Super Admin owns the announcement lane for global broadcasts.</p>
        </div>
      </div>
    </div>
  </section>
);

export default WorkspaceQuickActionsPanel;
