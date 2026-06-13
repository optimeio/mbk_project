// src/services/chatService.js
"use client";

import API from "./chatApi";

/**
 * Fetch list of chat conversations for the current user.
 * Returns an array of { id, title, lastMessage, updatedAt } objects.
 */
export const fetchChats = async () => {
  const response = await API.get("/chat/conversations");
  return response.data?.data || [];
};

/**
 * Fetch messages for a specific chat.
 * @param {string} chatId
 */
export const fetchChatMessages = async (chatId) => {
  const response = await API.get(`/chat/conversations/${chatId}/messages`);
  return response.data?.data || [];
};

/**
 * Send a new message in a chat.
 * @param {string} chatId
 * @param {string} content
 */
export const sendMessage = async (chatId, content) => {
  const response = await API.post(`/chat/conversations/${chatId}/messages`, {
    content,
  });
  return response.data?.data;
};

/**
 * Subscribe to real‑time updates via socket.
 * The socket instance is provided by src/lib/socket.js.
 */
export const subscribeToMessages = (socket, chatId, callback) => {
  if (!socket) return () => {};
  const eventName = `chat:${chatId}:message`;
  socket.on(eventName, callback);
  return () => socket.off(eventName, callback);
};
