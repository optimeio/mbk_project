import { StreamChat } from "stream-chat";

// ─── Environment Configuration ────────────────────────────────
const API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY || process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY;

// ─── User Role Definitions ────────────────────────────────────
export const ROLES = {
  SUPER_ADMIN: "SuperAdmin",
  SPOC_ADMIN: "SPOCAdmin",
  SPOC: "SPOCAdmin",
  TRAINER: "Trainer",
  COMPANY_ADMIN: "CompanyAdmin",
  COLLEGE_ADMIN: "CollegeAdmin",
};

// ─── Channel Type Definitions ─────────────────────────────────
export const CHANNEL_TYPES = {
  PRIVATE: "trainer-spoc-private",
  GROUP: "trainer-group-channel",
  ANNOUNCEMENT: "admin-announcement-channel",
};

const ANNOUNCEMENT_CUSTOM_TYPES = new Set(["announcement", "broadcast"]);

const isAnnouncementChannel = (channelOrType) => {
  if (!channelOrType) return false;

  if (typeof channelOrType === "string") {
    const normalized = normalizeToken(channelOrType);
    return (
      normalized === normalizeToken(CHANNEL_TYPES.ANNOUNCEMENT) ||
      normalized === "announcement" ||
      normalized === "broadcast"
    );
  }

  const channelType = normalizeToken(
    channelOrType?.data?.channel_type ||
      channelOrType?.data?.customType ||
      channelOrType?.type,
  );

  return (
    channelOrType?.data?.is_announcement === true ||
    channelType === normalizeToken(CHANNEL_TYPES.ANNOUNCEMENT) ||
    ANNOUNCEMENT_CUSTOM_TYPES.has(channelType)
  );
};

// ─── Demo Users ───────────────────────────────────────────────
export const DEMO_USERS = {
  admin: { id: 'admin-1', name: 'Master Admin', role: ROLES.SUPER_ADMIN, title: 'Systems Director' },
  spoc1: { id: 'spoc-1', name: 'Sarah SPOC', role: ROLES.SPOC_ADMIN, title: 'Regional Coordinator' },
  spoc2: { id: 'spoc-2', name: 'Mike SPOC', role: ROLES.SPOC_ADMIN, title: 'Training Lead' },
  trainer1: { id: 'trainer-1', name: 'Alice Trainer', role: ROLES.TRAINER, title: 'Lead Instructor' },
  trainer2: { id: 'trainer-2', name: 'Bob Trainer', role: ROLES.TRAINER, title: 'Course Facilitator' },
  trainer3: { id: 'trainer-3', name: 'Charlie Trainer', role: ROLES.TRAINER, title: 'Assistant Trainer' },
};

const normalizeToken = (value = "") =>
  String(value).trim().toLowerCase().replace(/[\s_-]+/g, "");

const inferRoleFromEmail = (email = "") => {
  const token = normalizeToken(email.split("@")[0] || email);
  if (!token) return null;
  if (token.includes("superadmin") || token.startsWith("super")) return ROLES.SUPER_ADMIN;
  if (token.includes("spoc")) return ROLES.SPOC_ADMIN;
  if (token.includes("trainer")) return ROLES.TRAINER;
  return null;
};

const STREAM_SYSTEM_ROLES = new Set(["admin", "user", "guest", "anonymous", "channel_member"]);

export const normalizeRole = (role, email = "") => {
  const token = normalizeToken(role);

  if (token.includes("superadmin")) return ROLES.SUPER_ADMIN;
  if (token.includes("spocadmin") || token === "spoc") return ROLES.SPOC_ADMIN;
  if (token.includes("trainer")) return ROLES.TRAINER;

  if (token.includes("companyadmin") || token.includes("collegeadmin")) return ROLES.SPOC_ADMIN;
  if (token === "admin") return ROLES.SUPER_ADMIN;

  const inferred = inferRoleFromEmail(email);
  return inferred || ROLES.TRAINER;
};

export const resolveUserRole = (user = {}) => {
  const roleCandidate =
    user?.role ||
    user?.portalRole ||
    user?.portal_role ||
    user?.portalRoleLabel ||
    user?.roleLabel ||
    "";
  return normalizeRole(roleCandidate, user?.email || user?.mail || "");
};

export const isTrainerRole = (role, email = "") => normalizeRole(role, email) === ROLES.TRAINER;
export const isSpocRole = (role, email = "") => normalizeRole(role, email) === ROLES.SPOC_ADMIN;
export const isSuperAdminRole = (role, email = "") => normalizeRole(role, email) === ROLES.SUPER_ADMIN;

/**
 * 1-to-1 messaging rule:
 * Trainer -> SPOC, Super Admin
 * SPOC -> Trainer, Super Admin
 * Super Admin -> Everyone (in chat role scope)
 */
export const canDirectMessageWith = (senderRole, targetRole) => {
  const from = normalizeRole(senderRole);
  const to = normalizeRole(targetRole);

  if (from === ROLES.SUPER_ADMIN) return true;
  if (from === ROLES.TRAINER) return [ROLES.SPOC_ADMIN, ROLES.SUPER_ADMIN].includes(to);
  if (from === ROLES.SPOC_ADMIN) return [ROLES.TRAINER, ROLES.SUPER_ADMIN].includes(to);
  return false;
};

/**
 * Returns a singleton StreamChat client instance.
 */
export const getStreamClient = (apiKeyOverride) => {
  return StreamChat.getInstance(apiKeyOverride || API_KEY);
};

const toSafeStreamUser = (user = {}) => {
  const safeUser = { ...user };
  const rawRole = String(safeUser?.role || "").trim();
  const normalizedSystemRole = normalizeToken(rawRole);

  if (rawRole && !STREAM_SYSTEM_ROLES.has(normalizedSystemRole)) {
    safeUser.portal_role =
      safeUser.portal_role ||
      safeUser.portalRole ||
      safeUser.portalRoleLabel ||
      rawRole;
    delete safeUser.role;
  }

  return safeUser;
};

export const connectStreamUser = async ({ apiKey, user, token }) => {
  const client = getStreamClient(apiKey);
  const safeUser = toSafeStreamUser(user || {});
  const safeUserId = safeUser?.id || safeUser?._id;

  if (client.userID && client.userID !== safeUserId) {
    await client.disconnectUser();
  }
  if (client.userID !== safeUserId) {
    await client.connectUser(safeUser, token);
  }
  return client;
};

/**
 * Connect a user using a dev token (for development purposes).
 */
export const connectUserDev = async (user) => {
  if (!user) return null;
  const userId = user.id || user._id;
  if (!userId) {
    console.error('connectUserDev: No user ID found', user);
    return null;
  }

  const client = getStreamClient();
  
  // If already connected as this user, just return the client
  if (client.userID === userId) {
    return client;
  }

  // If connected as a different user, disconnect first
  if (client.userID) {
    await client.disconnectUser();
  }
  
  try {
    const normalizedPortalRole = normalizeRole(user.role, user.email);
    const streamSystemRole = [ROLES.SUPER_ADMIN, ROLES.SPOC_ADMIN].includes(normalizedPortalRole)
      ? "admin"
      : "user";

    const streamUser = {
      id: userId,
      name: user.name || userId,
      role: streamSystemRole,
      portal_role: user.role || normalizedPortalRole,
      image: user.image,
    };
    await client.connectUser(streamUser, client.devToken(userId));
    return client;
  } catch (err) {
    console.error('connectUserDev error:', err);
    throw err;
  }
};

/**
 * Disconnect current user.
 */
export const disconnectStreamUser = async (client) => {
  if (client?.userID) {
    await client.disconnectUser();
  }
};

/**
 * Returns true if a user with the given role can send a message in the given channel.
 */
export const canSendMessage = (role, channelType) => {
  if (!role) return false;
  const normalizedRole = normalizeRole(role);
  const isAnnouncement = isAnnouncementChannel(channelType);

  // Broadcast lane is admin-only.
  if (isAnnouncement) {
    return normalizedRole === ROLES.SUPER_ADMIN;
  }

  if ([ROLES.SUPER_ADMIN, ROLES.SPOC_ADMIN, ROLES.TRAINER].includes(normalizedRole)) {
    return true;
  }

  return false;
};

/**
 * Returns true if the user can create a group based on their role.
 */
export const canCreateGroup = (role) => {
  const normalizedRole = normalizeRole(role);
  return [ROLES.SUPER_ADMIN, ROLES.SPOC_ADMIN].includes(normalizedRole);
};

/**
 * Returns true if the user can broadcast announcements.
 */
export const canBroadcast = (role) => {
  return normalizeRole(role) === ROLES.SUPER_ADMIN;
};

/**
 * Watch a messaging channel.
 */
export const watchMessagingChannel = async (client, channelId) => {
  if (!client || !channelId) return null;

  const channel = client.channel("messaging", channelId);
  await channel.watch();
  return channel;
};

/**
 * Common channel sort order.
 */
export const CHANNEL_SORT = [{ last_message_at: -1 }];

/**
 * Returns the relevant channel filter for the current user.
 */
export const getChannelFilter = (role, userId, announcementChannelId = null) => {
  if (!userId) return { id: { $in: [] } };

  // Keep ChannelList queries membership-scoped to avoid Stream 400 errors
  // for users that cannot query arbitrary channel ids.
  return {
    members: { $in: [userId] },
  };
};

/**
 * Helper to create or get a private channel.
 */
export const getOrCreatePrivateChannel = async (userId, targetId) => {
  const { chatService } = await import('@/services/chatService');
  return chatService.createDirectChannel(targetId);
};

/**
 * Helper to create or get a trainer group channel.
 */
export const getOrCreateTrainerGroup = async (userId, memberIds, name) => {
  const { chatService } = await import('@/services/chatService');
  return chatService.createGroupChannel({
    name,
    portalUserIds: memberIds
  });
};
