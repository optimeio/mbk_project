"use client";

import { useEffect, createContext, useContext } from "react";
import { LoaderCircle, Search } from "lucide-react";
import { ChannelList } from "stream-chat-react";
import { QUERY_OPTIONS, SORT, TABS } from "../constants";
import {
  channelKind,
  channelPreview,
  channelSubtitle,
  channelTitle,
  filtersForTab,
  getLaneEmptyState,
  timeAgo,
} from "../utils/channelMeta";

// Create context to share state with components that must be defined outside the parent render function
const WorkspaceChannelLaneContext = createContext(null);

const LaneEmptyState = () => {
  const { activeTab } = useContext(WorkspaceChannelLaneContext);
  return (
    <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
      {getLaneEmptyState(activeTab)}
    </div>
  );
};

const LaneShell = ({ children, loadedChannels = [], loading }) => {
  const { activeChannel, setActiveChannel, searchNeedle, activeTab } = useContext(WorkspaceChannelLaneContext);
  const activeTabMeta = TABS.find((tab) => tab.id === activeTab);

  useEffect(() => {
    if (!loadedChannels.length) return;
    if (!activeChannel) {
      setActiveChannel(loadedChannels[0]);
      return;
    }
    if (!searchNeedle && !loadedChannels.find((channel) => channel.cid === activeChannel.cid)) {
      setActiveChannel(loadedChannels[0]);
    }
  }, [activeChannel, loadedChannels, searchNeedle, setActiveChannel]);

  return (
    <>
      <div className="mt-4 flex items-center justify-between px-1">
        <div>
          <h2 className="text-base font-bold text-slate-950 dark:text-slate-50">
            {activeTabMeta?.label || "Channels"}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {loadedChannels.length} visible rooms
          </p>
        </div>
        {loading ? <LoaderCircle className="h-4 w-4 animate-spin text-slate-400" /> : null}
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </>
  );
};

const LanePreview = ({
  active,
  channel,
  onSelect,
  setActiveChannel: setStreamActiveChannel,
  unread,
  watchers,
}) => {
  const { setActiveChannel, bootstrap } = useContext(WorkspaceChannelLaneContext);

  const handleSelect = (event) => {
    onSelect?.(event);
    setActiveChannel(channel);
    setStreamActiveChannel?.(channel, watchers);
  };

  return (
    <button
      type="button"
      onClick={handleSelect}
      className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
        active
          ? "border-[#153E53] bg-[#E6F0F4] shadow-[0_14px_30px_rgba(21,62,83,0.1)] dark:border-[#215C79] dark:bg-[#102734]"
          : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
              {channelKind(channel) === "announcement" ? "Announcement" : channelKind(channel) === "group" ? "Group" : "Direct"}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              {timeAgo(channel.state?.latestMessages?.slice(-1)?.[0]?.created_at || channel.data?.updated_at)}
            </span>
          </div>
          <p className="mt-2 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {channelTitle(channel, bootstrap?.currentUser?.id)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {channelSubtitle(channel, bootstrap?.currentUser?.id)}
          </p>
          <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
            {channelPreview(channel)}
          </p>
        </div>
        {unread ? (
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#153E53] px-2 text-xs font-bold text-white">
            {unread}
          </span>
        ) : null}
      </div>
    </button>
  );
};

const WorkspaceChannelLane = ({
  activeChannel,
  activeTab,
  bootstrap,
  bootstrapError,
  chatClient,
  isBootstrapping,
  refreshKey,
  search,
  searchNeedle,
  setActiveChannel,
  setSearch,
}) => {
  const matchesSearch = (channel) => {
    if (!searchNeedle) return true;
    return [
      channelTitle(channel, bootstrap?.currentUser?.id),
      channelSubtitle(channel, bootstrap?.currentUser?.id),
      channelPreview(channel),
    ]
      .join(" ")
      .toLowerCase()
      .includes(searchNeedle);
  };

  const searchInput = (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search this lane"
          disabled={!bootstrap?.enabled}
          className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:text-slate-400 dark:text-slate-100 dark:disabled:text-slate-500"
        />
      </div>
    </div>
  );

  const contextValue = {
    activeTab,
    activeChannel,
    setActiveChannel,
    searchNeedle,
    bootstrap,
  };

  if (bootstrapError) {
    return (
      <section className="rounded-[28px] border border-white/70 bg-white/95 p-5 shadow-[0_20px_45px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950/90">
        {searchInput}
        <div className="mt-4 rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-200">
          {bootstrapError}
        </div>
      </section>
    );
  }

  if (isBootstrapping || (bootstrap?.enabled && !chatClient)) {
    return (
      <section className="rounded-[28px] border border-white/70 bg-white/95 p-5 shadow-[0_20px_45px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950/90">
        {searchInput}
        <div className="mt-8 text-center">
          <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-[#153E53]" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Loading channel lanes...</p>
        </div>
      </section>
    );
  }

  if (!bootstrap?.enabled) {
    return (
      <WorkspaceChannelLaneContext.Provider value={contextValue}>
        <section className="rounded-[28px] border border-white/70 bg-white/95 p-5 shadow-[0_20px_45px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950/90">
          {searchInput}
          <div className="mt-4">
            <LaneEmptyState />
          </div>
        </section>
      </WorkspaceChannelLaneContext.Provider>
    );
  }

  return (
    <WorkspaceChannelLaneContext.Provider value={contextValue}>
      <section className="rounded-[28px] border border-white/70 bg-white/95 p-5 shadow-[0_20px_45px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950/90">
        {searchInput}
        <ChannelList
          key={`${activeTab}-${refreshKey}`}
          channelRenderFilterFn={(channels) => channels.filter(matchesSearch)}
          customActiveChannel={activeChannel?.id}
          EmptyStateIndicator={LaneEmptyState}
          filters={filtersForTab(activeTab, bootstrap.currentUser.id, bootstrap.announcementChannel?.id)}
          List={LaneShell}
          options={QUERY_OPTIONS}
          Preview={LanePreview}
          sendChannelsToList
          sort={SORT}
        />
      </section>
    </WorkspaceChannelLaneContext.Provider>
  );
};

export default WorkspaceChannelLane;
