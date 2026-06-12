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

export const channelKind = (channel) => channel?.data?.customType || "direct";

export const channelMembers = (channel) => Object.values(channel?.state?.members || {});

export const channelTitle = (channel, currentUserId) => {
  if (!channel) return "Workspace";

  if (channelKind(channel) !== "direct") {
    return channel.data?.name || "Workspace room";
  }

  const other = channelMembers(channel).find((member) => member?.user?.id !== currentUserId);
  return other?.user?.name || channel.data?.name || "Private chat";
};

export const channelSubtitle = (channel, currentUserId) => {
  if (!channel) return "";

  if (channelKind(channel) === "direct") {
    const other = channelMembers(channel).find((member) => member?.user?.id !== currentUserId);
    return other?.user?.portalRoleLabel || other?.user?.portalRole || "Member";
  }

  const members = channelMembers(channel).length;
  return channelKind(channel) === "announcement" ? `${members} recipients` : `${members} members`;
};

export const channelPreview = (channel) => {
  const messages = channel?.state?.messages || [];
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage) return "No messages yet.";
  if (lastMessage.text) return lastMessage.text;
  if (lastMessage.attachments?.length) return "Shared an attachment";
  return "New activity";
};

export const filtersForTab = (tab, currentUserId, announcementId) => {
  const base = {
    type: "messaging",
    members: { $in: [currentUserId] },
  };

  if (tab === "announcements") {
    return announcementId ? { ...base, id: announcementId } : base;
  }

  return { ...base, customType: tab === "group" ? "group" : "direct" };
};

export const getLaneEmptyState = (tab) => {
  if (tab === "direct") {
    return "No private chats yet. Start one with a SPOC from Quick actions.";
  }
  if (tab === "group") {
    return "No trainer groups yet. SPOC Admins can create shared team rooms here.";
  }
  return "The announcement lane will appear once the broadcast channel is provisioned.";
};
