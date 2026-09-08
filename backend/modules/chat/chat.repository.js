const User = require("../../models/User");
const Student = require("../../models/Student");
const Company = require("../../models/Company");
const Notification = require("../../models/Notification");
const {
  listChatValidationLogs,
  logChatValidationSafe,
} = require("../../services/chatValidationLogService");
const {
  createChat,
  getChatInfo,
  listChats,
  sendMessage: sendCustomMessage,
  searchMessages,
} = require("../../services/customChatService");
const {
  deleteMessageForEveryone,
  deleteMessageForMe,
  getDirectConversationHistory,
} = require("../../services/realtimeMessageService");
const {
  sendAnnouncementMessage,
  createBroadcastChannel,
  createWorkspaceBootstrap,
  createWorkspaceFullBootstrap,
  createWorkspaceQuickBootstrap,
  clearChannelMessages,
  addMembersToGroup,
  createGroupChannel,
  createDirectChannel,
  deleteChannelForEveryone,
  deleteMessage,
  removeMemberFromGroup,
  removeChannelMember,
} = require("../../services/streamChatService");

const mapStudentToChatUser = (student) => ({
  _id: student._id,
  id: student._id,
  name: student.fullName || student.email,
  email: student.email,
  role: "student",
  profilePicture: student.profilePicture,
  accountStatus: "active",
});

const mapCompanyToChatUser = (company) => ({
  _id: company._id,
  id: company._id,
  name: company.name || company.adminName || company.email,
  email: company.email,
  role: "company",
  profilePicture: company.logo,
  accountStatus: "active",
});

const findChatBootstrapUserById = async ({ userId, roleHint } = {}) => {
  if (!userId) return null;

  const user = await User.findById(userId);
  if (user) return user;

  const normalizedHint = String(roleHint || "").trim().toLowerCase();
  if (normalizedHint === "student") {
    const student = await Student.findById(userId);
    if (student) return mapStudentToChatUser(student);
  }
  if (normalizedHint === "company" || normalizedHint === "companyadmin") {
    const company = await Company.findById(userId);
    if (company) return mapCompanyToChatUser(company);
  }

  const student = await Student.findById(userId);
  if (student) return mapStudentToChatUser(student);

  const company = await Company.findById(userId);
  if (company) return mapCompanyToChatUser(company);

  return null;
};

const findChatCreateActorById = async ({ userId } = {}) =>
  User.findById(userId).select("_id name role blockedUsers isActive");

const findChatDirectActorById = async ({ userId } = {}) =>
  User.findById(userId);

const findChatValidationRequesterById = async ({ requesterId } = {}) =>
  User.findById(requesterId).select("_id role");

const findChatBroadcastActorById = async ({ userId } = {}) =>
  User.findById(userId);

const listChatValidationLogsByQuery = async ({ query } = {}) =>
  listChatValidationLogs(query || {});

const searchChatMessagesByQuery = async ({ query } = {}) =>
  searchMessages(query || {});

const listChatsByQuery = async ({ query } = {}) =>
  listChats(query || {});

const listChatChannelAuditLogsByQuery = async ({ query } = {}) =>
  listChatValidationLogs(query || {});

const getChatMessageHistoryByQuery = async ({ query } = {}) =>
  getDirectConversationHistory(query || {});

const getChatInfoByQuery = async ({ query } = {}) =>
  getChatInfo(query || {});

const getChatWorkspaceBootstrapByUser = async ({ user } = {}) =>
  createWorkspaceBootstrap(user);

const getChatWorkspaceQuickBootstrapByUser = async ({ user } = {}) =>
  createWorkspaceQuickBootstrap(user);

const getChatWorkspaceFullBootstrapByUser = async ({ user } = {}) =>
  createWorkspaceFullBootstrap(user);

const createChatByContext = async ({ currentUser, payload } = {}) =>
  createChat({ currentUser, payload: payload || {} });

const createDirectChatByContext = async ({ currentUser, payload } = {}) =>
  createDirectChannel(currentUser, payload || {});

const createChatGroupByContext = async ({ currentUser, payload } = {}) =>
  createGroupChannel(currentUser, payload || {});

const createChatBroadcastChannelByContext = async ({ currentUser, payload } = {}) =>
  createBroadcastChannel(currentUser, payload || {});

const sendAnnouncementMessageByContext = async ({ currentUser, payload } = {}) =>
  sendAnnouncementMessage(currentUser, payload || {});

const listActiveBroadcastRecipientsByContext = async ({
  roles = [],
  excludeUserId = null,
} = {}) =>
  User.find({
    role: { $in: roles },
    isActive: { $ne: false },
    _id: { $ne: excludeUserId },
  }).select("_id role");

const createBroadcastNotifications = async ({ notifications = [] } = {}) =>
  Notification.insertMany(notifications);

const logChatValidationEventByContext = async ({ payload } = {}) =>
  logChatValidationSafe(payload || {});

const sendChatMessageByContext = async ({
  io,
  currentUser,
  payload,
} = {}) =>
  sendCustomMessage({
    io,
    currentUser,
    payload: payload || {},
  });

const deleteChatMessageForMeByContext = async ({
  io,
  actorId,
  messageId,
} = {}) =>
  deleteMessageForMe({
    io,
    actorId,
    messageId,
  });

const deleteChatMessageForEveryoneByContext = async ({
  io,
  actorId,
  messageId,
} = {}) =>
  deleteMessageForEveryone({
    io,
    actorId,
    messageId,
  });

const deleteChatMessageByContext = async ({
  currentUserId,
  messageId,
} = {}) => {
  const currentUser = await User.findById(currentUserId);
  return deleteMessage(currentUser, messageId);
};

const removeChatChannelMemberByContext = async ({
  currentUser,
  channelId,
  memberId,
  type,
} = {}) =>
  removeChannelMember(currentUser, channelId, memberId, type);

const removeUserFromChatChannelByContext = async ({
  currentUser,
  channelId,
  memberId,
  type,
} = {}) =>
  removeChannelMember(currentUser, channelId, memberId, type);

const clearChatChannelMessagesByContext = async ({
  currentUser,
  channelId,
  type,
} = {}) =>
  clearChannelMessages(currentUser, channelId, type);

const deleteChatChannelByContext = async ({
  currentUser,
  channelId,
  type,
} = {}) =>
  deleteChannelForEveryone(currentUser, channelId, type);

const addChatGroupMembersByContext = async ({
  currentUser,
  groupId,
  memberIds,
} = {}) =>
  addMembersToGroup(currentUser, groupId, memberIds);

const removeChatGroupMemberByContext = async ({
  currentUser,
  groupId,
  userIdToRemove,
} = {}) =>
  removeMemberFromGroup(currentUser, groupId, userIdToRemove);

module.exports = {
  findChatBootstrapUserById,
  findChatCreateActorById,
  findChatDirectActorById,
  findChatBroadcastActorById,
  createChatByContext,
  createDirectChatByContext,
  createChatGroupByContext,
  createChatBroadcastChannelByContext,
  sendAnnouncementMessageByContext,
  listActiveBroadcastRecipientsByContext,
  createBroadcastNotifications,
  logChatValidationEventByContext,
  removeChatChannelMemberByContext,
  removeUserFromChatChannelByContext,
  clearChatChannelMessagesByContext,
  deleteChatChannelByContext,
  addChatGroupMembersByContext,
  removeChatGroupMemberByContext,
  sendChatMessageByContext,
  deleteChatMessageByContext,
  deleteChatMessageForEveryoneByContext,
  deleteChatMessageForMeByContext,
  getChatWorkspaceFullBootstrapByUser,
  findChatValidationRequesterById,
  getChatWorkspaceQuickBootstrapByUser,
  getChatWorkspaceBootstrapByUser,
  getChatInfoByQuery,
  getChatMessageHistoryByQuery,
  listChatsByQuery,
  listChatChannelAuditLogsByQuery,
  listChatValidationLogsByQuery,
  searchChatMessagesByQuery,
};
