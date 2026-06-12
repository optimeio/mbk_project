export const statusClass = (tone = "info") => {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (tone === "error") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
};

export const timeAgo = (value) => {
  if (!value) return "Now";
  const date = new Date(value);
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);

  if (!Number.isFinite(minutes) || minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
};

const CHANNEL_KINDS = {
  ANNOUNCEMENT: "announcement",
  SPOC_TRAINER: "spoc-trainer",
  TRAINER_GROUP: "trainer-group",
};

const LEGACY_CHANNEL_KIND_MAP = {
  announcement: CHANNEL_KINDS.ANNOUNCEMENT,
  direct: CHANNEL_KINDS.SPOC_TRAINER,
  group: CHANNEL_KINDS.TRAINER_GROUP,
  [CHANNEL_KINDS.ANNOUNCEMENT]: CHANNEL_KINDS.ANNOUNCEMENT,
  [CHANNEL_KINDS.SPOC_TRAINER]: CHANNEL_KINDS.SPOC_TRAINER,
  [CHANNEL_KINDS.TRAINER_GROUP]: CHANNEL_KINDS.TRAINER_GROUP,
};

export const channelKind = (channel) =>
  LEGACY_CHANNEL_KIND_MAP[channel?.data?.customType] || CHANNEL_KINDS.SPOC_TRAINER;

export const channelMembers = (channel) => Object.values(channel?.state?.members || {});

export const directCounterparty = (channel, currentUserId) =>
  channelMembers(channel).find((member) => member?.user?.id !== currentUserId);

export const channelTitle = (channel, currentUserId) => {
  if (!channel) return "Workspace";

  if (channelKind(channel) !== CHANNEL_KINDS.SPOC_TRAINER) {
    return channel.data?.name || "Workspace room";
  }

  const other = directCounterparty(channel, currentUserId);
  return other?.user?.name || channel.data?.name || "Private chat";
};

export const channelSubtitle = (channel, currentUserId) => {
  if (!channel) return "";

  if (channelKind(channel) === CHANNEL_KINDS.SPOC_TRAINER) {
    const other = directCounterparty(channel, currentUserId);
    return other?.user?.portalRoleLabel || other?.user?.portalRole || "Member";
  }

  const members = channelMembers(channel).length;
  return channelKind(channel) === CHANNEL_KINDS.ANNOUNCEMENT ? `${members} recipients` : `${members} members`;
};

export const channelPreview = (channel) => {
  const messages = channel?.state?.messages || [];
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage) return "No messages yet.";
  if (lastMessage.text) return lastMessage.text;
  if (lastMessage.attachments?.length) return "Shared an attachment";
  return "New activity";
};

export const channelPresence = (channel, currentUserId) => {
  if (!channel) return null;

  if (channelKind(channel) === CHANNEL_KINDS.SPOC_TRAINER) {
    const other = directCounterparty(channel, currentUserId);

    if (other?.user?.online) {
      return { isOnline: true, label: "Online now" };
    }

    if (other?.user?.last_active) {
      return {
        isOnline: false,
        label: `Last active ${timeAgo(other.user.last_active)}`,
      };
    }

    return { isOnline: false, label: "Offline" };
  }

  const onlineCount = channelMembers(channel).filter((member) => {
    if (!member?.user?.online) return false;
    return channelKind(channel) === CHANNEL_KINDS.ANNOUNCEMENT
      ? true
      : member.user.id !== currentUserId;
  }).length;

  if (channelKind(channel) === CHANNEL_KINDS.ANNOUNCEMENT) {
    return {
      isOnline: onlineCount > 0,
      label: onlineCount > 0 ? `${onlineCount} online now` : "Broadcast history",
    };
  }

  return {
    isOnline: onlineCount > 0,
    label: onlineCount > 0 ? `${onlineCount} online` : "No one online",
  };
};

export const presenceClass = (presence) =>
  presence?.isOnline
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100"
    : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";

export const filtersForTab = (tab, currentUserId, announcementId) => {
  const base = {
    type: "messaging",
    members: { $in: [currentUserId] },
  };

  if (tab === "announcements") {
    return announcementId
      ? { ...base, id: announcementId }
      : { ...base, customType: { $in: [CHANNEL_KINDS.ANNOUNCEMENT, "announcement"] } };
  }

  return {
    ...base,
    customType: {
      $in:
        tab === "group"
          ? [CHANNEL_KINDS.TRAINER_GROUP, "group"]
          : [CHANNEL_KINDS.SPOC_TRAINER, "direct"],
    },
  };
};

export const getLaneEmptyState = (tab) => {
  if (tab === "direct") {
    return "No private chats yet. Start one with your SPOC from the quick actions panel.";
  }
  if (tab === "group") {
    return "No trainer group channels yet. SPOC Admins can create one from quick actions.";
  }
  return "The announcement lane will appear once the broadcast channel is provisioned.";
};
