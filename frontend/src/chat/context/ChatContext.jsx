"use client";

import React, { createContext, useContext, useMemo } from 'react';

const ChatContext = createContext(null);

export function ChatProvider({ children, client, currentUser, users, isDark }) {
  const value = useMemo(() => ({
    client,
    currentUser,
    users,
    isDark
  }), [client, currentUser, users, isDark]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
