import { api } from "@/services/api";

export const chatService = {
  async getBootstrap() {
    return api.get("/chat/bootstrap");
  },

  async getQuickBootstrap() {
    return api.get("/chat/quick-bootstrap");
  },

  async getFullBootstrap() {
    return api.get("/chat/full-bootstrap");
  },

  async getToken() {
    return api.post("/chat/token");
  },

  async createDirectChannel(portalUserId) {
    return api.post("/chat/direct", { portalUserId });
  },

  async createChat(payload) {
    return api.post("/chat/create", payload);
  },

  async listChats({ search = "", page = 1, limit = 30 } = {}) {
    const encodedSearch = encodeURIComponent(String(search || "").trim());
    const query = `search=${encodedSearch}&page=${Number(page) || 1}&limit=${Number(limit) || 30}`;
    return api.get(`/chat?${query}`);
  },

  async createGroupChannel(payload) {
    return api.post("/chat/group/create", payload);
  },

  async addGroupMembers(groupId, memberIds) {
    return api.post(`/chat/group/${groupId}/add-members`, { memberIds });
  },

  async removeGroupMember(groupId, userId) {
    return api.delete(`/chat/group/${groupId}/remove-member/${userId}`);
  },

  async sendAnnouncement(payload) {
    const normalizedPayload =
      typeof payload === "string"
        ? { text: payload }
        : payload && typeof payload === "object"
          ? payload
          : { text: String(payload || "") };

    return api.post("/chat/broadcast", normalizedPayload);
  },

  async sendMessage(payload) {
    try {
      return await api.post("/message/send", payload);
    } catch (err) {
      return api.post("/chat/message/send", payload);
    }
  },

  async getMessageHistory(otherUserId, page = 1, limit = 50) {
    return api.get(`/chat/message/history/${otherUserId}?page=${page}&limit=${limit}`);
  },

  async searchMessages(search, page = 1, limit = 20) {
    const encodedSearch = encodeURIComponent(String(search || "").trim());
    try {
      return await api.get(`/message/search?search=${encodedSearch}&page=${page}&limit=${limit}`);
    } catch (err) {
      return api.get(`/chat/message/search?search=${encodedSearch}&page=${page}&limit=${limit}`);
    }
  },

  async getChatMessages(chatId, page = 1, limit = 50) {
    return api.get(`/message/${chatId}?page=${page}&limit=${limit}`);
  },

  async getChatInfo(chatId, mediaLimit = 100, fileLimit = 100, linkLimit = 100) {
    return api.get(`/message/${chatId}/info?mediaLimit=${mediaLimit}&fileLimit=${fileLimit}&linkLimit=${linkLimit}`);
  },

  async markDelivered(messageIds = [], chatId = null) {
    return api.post("/message/delivered", {
      messageIds: Array.isArray(messageIds) ? messageIds : [],
      chatId,
    });
  },

  async uploadChatFile(formData) {
    return api.post("/upload", formData);
  },

  async deleteMessageForMe(messageId) {
    try {
      return await api.put(`/message/${messageId}/delete-for-me`);
    } catch (err) {
      return api.put(`/chat/message/${messageId}/delete-for-me`);
    }
  },

  async deleteMessageForEveryone(messageId) {
    try {
      return await api.put(`/message/${messageId}/delete-for-everyone`);
    } catch (err) {
      return api.put(`/chat/message/${messageId}/delete-for-everyone`);
    }
  },

  async removeMember(channelId, memberId, type = 'messaging') {
    return api.delete(`/chat/channel/${channelId}/remove-user/${memberId}?type=${type}`);
  },

  async leaveChannel(channelId, type = 'messaging') {
    return api.delete(`/chat/channel/${channelId}/leave?type=${type}`);
  },

  async deleteChannel(channelId, type = 'messaging') {
    return api.delete(`/chat/channel/${channelId}?type=${type}`);
  },
};

export default chatService;
