// src/context/ChatContext.jsx
"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import { fetchChats, fetchChatMessages, sendMessage, subscribeToMessages } from "@/services/chatService";

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messages, setMessages] = useState([]);

  // Initialize socket lazily when needed
  useEffect(() => {
    const s = getSocket();
    setSocket(s);
    return () => {
      // cleanup on unmount
      if (s) s.disconnect();
    };
  }, []);

  // Load chats list on mount
  useEffect(() => {
    const loadChats = async () => {
      try {
        const data = await fetchChats();
        setChats(data);
      } catch (e) {
        console.error("Failed to fetch chats", e);
      }
    };
    loadChats();
  }, []);

  // Load messages when a chat is selected
  useEffect(() => {
    if (!selectedChatId) return;
    const loadMessages = async () => {
      try {
        const msgs = await fetchChatMessages(selectedChatId);
        setMessages(msgs);
      } catch (e) {
        console.error("Failed to fetch messages", e);
      }
    };
    loadMessages();
  }, [selectedChatId]);

  // Subscribe to real‑time updates for the selected chat
  useEffect(() => {
    if (!socket || !selectedChatId) return undefined;
    const unsubscribe = subscribeToMessages(socket, selectedChatId, (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    return unsubscribe;
  }, [socket, selectedChatId]);

  const selectChat = useCallback((chatId) => {
    setSelectedChatId(chatId);
  }, []);

  const postMessage = useCallback(
    async (content) => {
      if (!selectedChatId) return;
      try {
        const newMsg = await sendMessage(selectedChatId, content);
        setMessages((prev) => [...prev, newMsg]);
      } catch (e) {
        console.error("Failed to send message", e);
      }
    },
    [selectedChatId]
  );

  return (
    <ChatContext.Provider
      value={{
        chats,
        selectedChatId,
        messages,
        selectChat,
        postMessage,
        socket,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within a ChatProvider");
  return ctx;
};
