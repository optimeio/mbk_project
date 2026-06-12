"use client";

import {
  FileImage,
  FileText,
  Files,
  LoaderCircle,
  Send,
} from "lucide-react";
import {
  Channel,
  ChannelHeader,
  MessageInput,
  MessageList,
  Thread,
  TypingIndicator,
  Window,
} from "stream-chat-react";
import {
  channelKind,
  channelSubtitle,
  channelTitle,
} from "../utils/channelMeta";

const WorkspaceConversationPanel = ({
  activeChannel,
  announcementDraft,
  bootstrap,
  bootstrapError,
  busyAction,
  chatClient,
  handlePublishAnnouncement,
  isBootstrapping,
  permissions,
  setAnnouncementDraft,
}) => {
  if (isBootstrapping) {
    return (
      <section className="rounded-[28px] border border-white/70 bg-white/95 p-8 text-center shadow-[0_20px_45px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950/90">
        <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-[#153E53]" />
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Connecting the messaging workspace...</p>
      </section>
    );
  }

  if (bootstrapError) {
    return (
      <section className="rounded-[28px] border border-rose-200 bg-rose-50 p-8 dark:border-rose-900/70 dark:bg-rose-950/30">
        <h2 className="text-xl font-bold text-rose-700 dark:text-rose-200">Workspace unavailable</h2>
        <p className="mt-3 text-sm leading-6 text-rose-600 dark:text-rose-200/80">{bootstrapError}</p>
      </section>
    );
  }

  if (bootstrap?.enabled && !chatClient) {
    return (
      <section className="rounded-[28px] border border-white/70 bg-white/95 p-8 text-center shadow-[0_20px_45px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950/90">
        <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-[#153E53]" />
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Joining Stream Chat...</p>
      </section>
    );
  }

  if (!bootstrap?.enabled) {
    return (
      <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-8 dark:border-amber-900/70 dark:bg-amber-950/30">
        <h2 className="text-xl font-bold text-amber-800 dark:text-amber-100">Stream setup required</h2>
        <p className="mt-3 text-sm leading-6 text-amber-700 dark:text-amber-100/80">
          {bootstrap?.message || "Add Stream credentials and install the SDKs to enable real-time chat."}
        </p>
      </section>
    );
  }

  if (!activeChannel) {
    return (
      <section className="rounded-[28px] border border-white/70 bg-white/95 p-8 dark:border-slate-800 dark:bg-slate-950/90">
        <h2 className="text-xl font-bold text-slate-950 dark:text-slate-50">Select a conversation</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Choose a private chat, trainer group, or announcement lane from the sidebar to start messaging.
        </p>
      </section>
    );
  }

  const isAnnouncement = channelKind(activeChannel) === "announcement";

  return (
    <Channel channel={activeChannel}>
      <Window>
        <div className="border-b border-white/70 bg-white/80 px-5 py-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/85">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {isAnnouncement ? "Broadcast lane" : channelKind(activeChannel) === "group" ? "Trainer group" : "Private lane"}
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-950 dark:text-slate-50">
                {channelTitle(activeChannel, bootstrap?.currentUser?.id)}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {channelSubtitle(activeChannel, bootstrap?.currentUser?.id)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <FileImage className="h-3.5 w-3.5" />
                Images
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <FileText className="h-3.5 w-3.5" />
                PDFs
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <Files className="h-3.5 w-3.5" />
                Documents
              </span>
            </div>
          </div>
        </div>

        <ChannelHeader />

        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          {isAnnouncement
            ? "Super Admin can broadcast announcements to all trainers and SPOC Admins from this lane."
            : "Typing indicators, timestamps, read receipts, emoji input, drag-and-drop uploads, and attachment previews are enabled."}
        </div>

        <MessageList />

        {!isAnnouncement ? (
          <div className="border-t border-slate-200 bg-white/70 px-4 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-400">
            <TypingIndicator />
          </div>
        ) : null}

        {isAnnouncement ? (
          <div className="border-t border-slate-200 bg-white/75 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/70">
            {permissions.canSendAnnouncements ? (
              <form className="space-y-3" onSubmit={handlePublishAnnouncement}>
                <textarea
                  value={announcementDraft}
                  onChange={(event) => setAnnouncementDraft(event.target.value)}
                  placeholder="Share an organization-wide announcement..."
                  rows={3}
                  className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#153E53] focus:ring-4 focus:ring-[#153E53]/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
                <button
                  type="submit"
                  disabled={busyAction === "announcement" || !announcementDraft.trim()}
                  className="inline-flex items-center gap-2 rounded-full bg-[#153E53] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f2f3a] disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                >
                  {busyAction === "announcement" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Publish announcement
                </button>
              </form>
            ) : (
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                Announcement history is read-only for this role.
              </div>
            )}
          </div>
        ) : (
          <MessageInput />
        )}
      </Window>
      <Thread />
    </Channel>
  );
};

export default WorkspaceConversationPanel;
